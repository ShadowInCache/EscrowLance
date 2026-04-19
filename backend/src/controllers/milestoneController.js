import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import Transaction from "../models/Transaction.js";
import { getContract } from "../blockchain/contractClient.js";
import {
  approveMilestoneOnChain,
  releasePaymentOnChain,
} from "../services/blockchainService.js";

const isProjectParticipant = (project, user) => {
  if (!project || !user) return false;
  if (user.role === "admin") return true;
  return [project.clientId, project.freelancerId].some(
    (memberId) => memberId && String(memberId) === String(user._id)
  );
};

const isProjectClientOwner = (project, user) => {
  if (!project || !user) return false;
  if (user.role === "admin") return true;
  return String(project.clientId) === String(user._id);
};

export const createMilestone = async (req, res) => {
  const { projectId, title, description, amount, deadline } = req.body;

  if (!projectId || !title || !amount) {
    return res.status(400).json({ message: "projectId, title, and amount are required" });
  }

  const project = await Project.findById(projectId).select("clientId milestones");
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (!isProjectClientOwner(project, req.user)) {
    return res.status(403).json({ message: "Only the project owner or admin can create milestones" });
  }

  const contractMilestoneId = project.milestones?.length || 0;
  const milestone = await Milestone.create({
    projectId,
    title,
    description,
    amount,
    deadline,
    contractMilestoneId,
  });
  await Project.findByIdAndUpdate(projectId, { $push: { milestones: milestone._id } });
  res.status(201).json(milestone);
};

export const submitMilestone = async (req, res) => {
  try {
    const { projectId, milestoneId, workHash, ipfsHash, amount, title, deadline, submitTxHash } = req.body;
    if (!projectId || !milestoneId || !submitTxHash) {
      return res.status(400).json({ message: "projectId, milestoneId, and submitTxHash are required" });
    }

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });
    if (milestone.status !== "Pending") return res.status(400).json({ message: "Milestone already submitted" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (String(milestone.projectId) !== String(project._id)) {
      return res.status(400).json({ message: "Milestone does not belong to this project" });
    }

    if (!isProjectParticipant(project, req.user)) {
      return res.status(403).json({ message: "You are not allowed to submit for this project" });
    }

    if (String(project.freelancerId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the assigned freelancer can submit this milestone" });
    }

    if (project.contractProjectId === undefined || project.contractProjectId === null) {
      return res.status(400).json({ message: `Project not deployed on-chain yet. Missing contractProjectId. Project ID: ${project._id}` });
    }
    if (milestone.contractMilestoneId === undefined || milestone.contractMilestoneId === null) {
      return res.status(400).json({ message: `Milestone not properly linked to contract. Missing contractMilestoneId. Milestone ID: ${milestone._id}` });
    }

    const normalizedSubmitTxHash = submitTxHash.trim();
    if (!normalizedSubmitTxHash) {
      return res.status(400).json({ message: "submitTxHash is required" });
    }

    const effectiveWorkHash = (workHash || ipfsHash || "").trim();
    if (!effectiveWorkHash) {
      return res.status(400).json({ message: "Provide workHash or ipfsHash" });
    }

    const contract = getContract();
    const receipt = await contract.runner.provider.getTransactionReceipt(normalizedSubmitTxHash);
    if (!receipt) {
      return res.status(400).json({ message: "Submission transaction not found on-chain yet" });
    }
    if (receipt.status !== 1) {
      return res.status(400).json({ message: "Submission transaction failed on-chain" });
    }

    if (receipt.to && contract.target && String(receipt.to).toLowerCase() !== String(contract.target).toLowerCase()) {
      return res.status(400).json({ message: "Submission transaction was sent to a different contract" });
    }

    if (req.user.walletAddress && receipt.from && receipt.from.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
      return res.status(403).json({ message: "Submission transaction was not signed by the freelancer wallet" });
    }

    const milestoneEvent = receipt.logs
      ? receipt.logs
          .map((log) => {
            try {
              return contract.interface.parseLog(log);
            } catch (err) {
              return null;
            }
          })
          .find((parsed) => parsed?.name === "MilestoneSubmitted")
      : null;
    if (!milestoneEvent) {
      return res.status(400).json({ message: "Submission event not found in transaction receipt" });
    }
    if (Number(milestoneEvent.args.projectId) !== Number(project.contractProjectId)) {
      return res.status(400).json({ message: "Submission transaction projectId does not match" });
    }
    if (Number(milestoneEvent.args.milestoneId) !== Number(milestone.contractMilestoneId)) {
      return res.status(400).json({ message: "Submission transaction milestoneId does not match" });
    }
    if ((milestoneEvent.args.workHash || "") !== effectiveWorkHash) {
      return res.status(400).json({ message: "Submission transaction workHash does not match" });
    }

    milestone.status = "Submitted";
    if (amount) milestone.amount = amount;
    if (title) milestone.title = title;
    if (deadline) milestone.deadline = deadline;
    milestone.workHash = effectiveWorkHash;
    milestone.ipfsHash = (ipfsHash || "").trim() || milestone.ipfsHash;
    milestone.submitTxHash = receipt.hash;
    await milestone.save();

    project.status = "Submitted";
    await project.save();

    await Transaction.create({
      projectId: project._id,
      milestoneId: milestone._id,
      amount: Number(milestone.amount),
      txHash: receipt.hash,
      status: "Completed",
      action: "submitMilestone",
      userId: req.user._id,
    });

    res.json(milestone);
  } catch (err) {
    console.error("submitMilestone error:", err.message);
    res.status(500).json({ message: `Submission failed: ${err.message}` });
  }
};

export const approveMilestone = async (req, res) => {
  try {
    const { projectId, milestoneId } = req.body;
    if (!projectId || !milestoneId) {
      return res.status(400).json({ message: "projectId and milestoneId are required" });
    }

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });
    if (milestone.status === "Paid") return res.status(400).json({ message: "Milestone already paid" });
    if (milestone.status !== "Submitted") return res.status(400).json({ message: "Milestone must be submitted before approval" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (String(milestone.projectId) !== String(project._id)) {
      return res.status(400).json({ message: "Milestone does not belong to this project" });
    }

    if (!isProjectClientOwner(project, req.user)) {
      return res.status(403).json({ message: "Only the project owner or admin can approve milestones" });
    }

    if (project.contractProjectId === undefined || project.contractProjectId === null) {
      return res.status(400).json({ message: "Project must be deployed on-chain before approval" });
    }

    if (milestone.contractMilestoneId === undefined || milestone.contractMilestoneId === null) {
      return res.status(400).json({ message: "Milestone must have a valid on-chain milestone index" });
    }

    const tx = await approveMilestoneOnChain({
      projectId: project.contractProjectId,
      milestoneId: milestone.contractMilestoneId,
    });
    const receipt = await tx.wait();

    milestone.status = "Approved";
    milestone.approveTxHash = receipt.hash;
    await milestone.save();

    await Transaction.create({
      projectId: project._id,
      milestoneId: milestone._id,
      amount: Number(milestone.amount),
      txHash: receipt.hash,
      status: "Completed",
      action: "approveMilestone",
      userId: req.user._id,
    });

    res.json({ milestone, approveTx: receipt.hash });
  } catch (err) {
    console.error("approveMilestone error:", err.message);
    res.status(500).json({ message: `Approval failed: ${err.message}` });
  }
};

export const releasePayment = async (req, res) => {
  try {
    const { projectId, milestoneId, amount } = req.body;
    if (!projectId || !milestoneId) {
      return res.status(400).json({ message: "projectId and milestoneId are required" });
    }

    const milestone = await Milestone.findById(milestoneId);
    const project = await Project.findById(projectId);
    if (!milestone || !project) return res.status(404).json({ message: "Not found" });

    if (String(milestone.projectId) !== String(project._id)) {
      return res.status(400).json({ message: "Milestone does not belong to this project" });
    }

    if (!isProjectClientOwner(project, req.user)) {
      return res.status(403).json({ message: "Only the project owner or admin can release milestone payments" });
    }

    if (milestone.status === "Paid") {
      return res.status(400).json({ message: "Milestone already paid" });
    }

    if (milestone.status !== "Approved") {
      return res.status(400).json({ message: "Milestone must be approved before payment release" });
    }

    if (project.contractProjectId === undefined || project.contractProjectId === null) {
      return res.status(400).json({ message: "Project must be deployed on-chain before payment release" });
    }

    if (milestone.contractMilestoneId === undefined || milestone.contractMilestoneId === null) {
      return res.status(400).json({ message: "Milestone must have a valid on-chain milestone index" });
    }

    const numericAmount = Number(amount || milestone.amount);

    const tx = await releasePaymentOnChain({
      projectId: project.contractProjectId,
      milestoneId: milestone.contractMilestoneId,
    });
    const receipt = await tx.wait();

    milestone.status = "Paid";
    milestone.payTxHash = receipt.hash;
    await milestone.save();

    project.remainingBalance = Math.max(Number(project.remainingBalance || 0) - numericAmount, 0);
    if (project.remainingBalance === 0) {
      project.status = "Completed";
    }
    await project.save();

    const txDoc = await Transaction.create({
      projectId: project._id,
      milestoneId: milestone._id,
      amount: numericAmount,
      txHash: receipt.hash,
      status: "Completed",
      action: "releasePayment",
      userId: req.user._id,
    });

    res.json({ milestone, transaction: txDoc, payTx: receipt.hash });
  } catch (err) {
    console.error("releasePayment error:", err.message);
    res.status(500).json({ message: `Payment release failed: ${err.message}` });
  }
};

export const listByProject = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (!isProjectParticipant(project, req.user)) {
    return res.status(403).json({ message: "You are not allowed to view milestones for this project" });
  }

  const milestones = await Milestone.find({ projectId: req.params.projectId }).sort({ contractMilestoneId: 1, createdAt: 1 });
  res.json(milestones);
};
