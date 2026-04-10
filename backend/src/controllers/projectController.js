import Project from "../models/Project.js";
import Milestone from "../models/Milestone.js";
import Transaction from "../models/Transaction.js";
import { ethers } from "ethers";
import {
  createProjectOnChain,
  fundProjectOnChain,
  assignFreelancerOnChain,
  cancelProjectOnChain,
  refundClientOnChain,
} from "../services/blockchainService.js";
import { getContract } from "../blockchain/contractClient.js";

const deployProjectOnChain = async (project, userId) => {
  const budgetWei = ethers.parseEther(String(project.budget));
  const contract = getContract();

  const code = await contract.runner.provider.getCode(contract.target);
  if (code === "0x") {
    console.error("Configured CHAINESCROW_CONTRACT_ADDRESS has no contract code. Check deployment address.");
    throw new Error("Escrow contract not deployed at configured address");
  }

  console.log(`Creating project on-chain: ${project.title}, budget: ${project.budget} ETH (${budgetWei} wei)`);
  const tx = await contract.createProject(project.title, project.description, budgetWei);
  console.log(`Tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Receipt received:`, receipt?.hash);

  if (!receipt) {
    throw new Error("Project created but on-chain ID not confirmed. Please try again.");
  }

  let projectId = null;
  if (receipt.logs && receipt.logs.length) {
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === "ProjectCreated" && parsed.args?.projectId !== undefined) {
          projectId = parsed.args.projectId;
          console.log("Got projectId from event:", projectId.toString());
          break;
        }
      } catch (err) {
        // ignore non-matching logs
      }
    }
  }

  if (projectId === null) {
    try {
      const count = await contract.projectCount();
      if (count && Number(count) > 0) {
        projectId = count;
        console.warn("Could not extract projectId from receipt. Falling back to projectCount():", projectId.toString());
      }
    } catch (fallbackErr) {
      console.warn("Could not extract projectId; fallback failed:", fallbackErr.message);
    }
  }

  if (projectId === null) {
    throw new Error("Could not determine on-chain projectId from tx receipt or projectCount");
  }

  project.contractProjectId = Number(projectId);
  project.createTxHash = receipt.hash;
  await project.save();
  console.log(`Project saved with contractProjectId: ${project.contractProjectId}`);

  await Transaction.create({
    projectId: project._id,
    action: "createProject",
    txHash: receipt.hash,
    status: "Completed",
    userId,
  });

  return { project, receipt };
};

export const createProject = async (req, res) => {
  const { title, description, budget, deadline, freelancerId, milestones = [] } = req.body;

  if (!title || !description || !budget) {
    return res.status(400).json({ message: "Title, description, and budget are required" });
  }
  const numericBudget = Number(budget);
  if (Number.isNaN(numericBudget) || numericBudget <= 0) {
    return res.status(400).json({ message: "Budget must be greater than 0" });
  }
  if (deadline && new Date(deadline) < new Date()) {
    return res.status(400).json({ message: "Deadline must be in the future" });
  }
  const sumMilestones = milestones.reduce((acc, m) => acc + Number(m.amount || 0), 0);
  if (milestones.length && Math.abs(sumMilestones - numericBudget) > 1e-9) {
    return res.status(400).json({ message: "Sum of milestone amounts must equal project budget" });
  }

  const project = await Project.create({
    title,
    description,
    budget: numericBudget,
    deadline,
    clientId: req.user._id,
    freelancerId,
    status: "Created",
    remainingBalance: numericBudget,
  });

  const createdMilestones = await Milestone.insertMany(
    milestones.map((m, idx) => ({
      projectId: project._id,
      title: m.title,
      description: m.description,
      amount: m.amount,
      deadline: m.deadline,
      contractMilestoneId: idx,
    }))
  );

  project.milestones = createdMilestones.map((m) => m._id);
  await project.save();

  try {
    await deployProjectOnChain(project, req.user._id);
  } catch (err) {
    console.error("On-chain project creation failed:", err.message, err.stack);
    // Keep DB and chain state consistent: remove local records if chain mapping failed.
    await Milestone.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(project._id);
    return res.status(502).json({ message: `Project creation failed on-chain: ${err.message}` });
  }

  return res.status(201).json({ project, milestones: createdMilestones });
};

export const deployProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });

  if (project.contractProjectId !== undefined && project.contractProjectId !== null) {
    return res.status(400).json({ message: "Project is already deployed on-chain" });
  }

  if (project.clientId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the project owner or admin can deploy" });
  }

  try {
    await deployProjectOnChain(project, req.user._id);
    res.json(project);
  } catch (err) {
    console.error("deployProject error:", err.message, err.stack);
    res.status(502).json({ message: `Project deployment failed on-chain: ${err.message}` });
  }
};

export const listProjects = async (req, res) => {
  const filter = req.user.role === "client" ? { clientId: req.user._id } : { freelancerId: req.user._id };
  const projects = await Project.find(filter).populate("milestones");
  res.json(projects);
};

export const getProject = async (req, res) => {
  const project = await Project.findById(req.params.id).populate("milestones");
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json(project);
};

export const updateStatus = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  project.status = req.body.status;
  await project.save();
  res.json(project);
};

export const fundProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  const amountWei = req.body.amountWei;
  const tx = await fundProjectOnChain({ projectId: project.contractProjectId, amountWei });
  const receipt = await tx.wait();
  project.funded = true;
  project.status = "Funded";
   project.fundTxHash = receipt.hash;
  await project.save();

  await Transaction.create({
    projectId: project._id,
    action: "fundProject",
    txHash: receipt.hash,
    status: "Completed",
    amount: Number(ethers.formatEther(amountWei)),
    userId: req.user._id,
  });

  res.json({ project, receipt });
};

export const assignFreelancer = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  const { freelancerWallet, freelancerId } = req.body;
  const tx = await assignFreelancerOnChain({ projectId: project.contractProjectId, freelancer: freelancerWallet });
  const receipt = await tx.wait();
  project.freelancerId = freelancerId || project.freelancerId;
  project.status = "InProgress";
  project.assignTxHash = receipt.hash;
  await project.save();

  await Transaction.create({
    projectId: project._id,
    action: "assignFreelancer",
    txHash: receipt.hash,
    status: "Completed",
    userId: req.user._id,
  });
  res.json(project);
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.clientId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the project owner or admin can delete" });
    }
    // Only allow deletion if project is in Created or Cancelled status
    if (!["Created", "Cancelled"].includes(project.status)) {
      return res.status(400).json({ message: `Cannot delete project with status ${project.status}` });
    }

    // Delete milestones associated with this project
    await Milestone.deleteMany({ projectId: project._id });
    // Delete project
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project and associated milestones deleted" });
  } catch (err) {
    console.error("Delete project error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const cancelProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  const tx = await cancelProjectOnChain({ projectId: project.contractProjectId });
  await tx.wait();
  project.status = "Cancelled";
  await project.save();
  res.json(project);
};

export const refundClient = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  const tx = await refundClientOnChain({ projectId: project.contractProjectId });
  const receipt = await tx.wait();
  project.status = "Refunded";
  project.refundTxHash = receipt.hash;
  await project.save();
  await Transaction.create({
    projectId: project._id,
    action: "refundClient",
    txHash: receipt.hash,
    status: "Completed",
    userId: req.user._id,
  });
  res.json(project);
};
