import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import Transaction from "../models/Transaction.js";
import { getContract } from "../blockchain/contractClient.js";
import {
  approveMilestoneOnChain,
  releasePaymentOnChain,
} from "../services/blockchainService.js";

export const createMilestone = async (req, res) => {
  const { projectId, title, description, amount, deadline } = req.body;
  const milestone = await Milestone.create({ projectId, title, description, amount, deadline });
  await Project.findByIdAndUpdate(projectId, { $push: { milestones: milestone._id } });
  res.status(201).json(milestone);
};

export const submitMilestone = async (req, res) => {
  try {
    const { projectId, milestoneId, workHash, ipfsHash, amount, title, deadline, submitTxHash } = req.body;
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });
    if (milestone.status !== "Pending") return res.status(400).json({ message: "Milestone already submitted" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!project.contractProjectId || project.contractProjectId === undefined || project.contractProjectId === null) {
      return res.status(400).json({ message: `Project not deployed on-chain yet. Missing contractProjectId. Project ID: ${project._id}` });
    }
    if (milestone.contractMilestoneId === undefined || milestone.contractMilestoneId === null) {
      return res.status(400).json({ message: `Milestone not properly linked to contract. Missing contractMilestoneId. Milestone ID: ${milestone._id}` });
    }
    if (!submitTxHash) {
      return res.status(400).json({ message: "submitTxHash is required" });
    }

    const contract = getContract();
    const receipt = await contract.runner.provider.getTransactionReceipt(submitTxHash);
    if (!receipt) {
      return res.status(400).json({ message: "Submission transaction not found on-chain yet" });
    }
    if (receipt.status !== 1) {
      return res.status(400).json({ message: "Submission transaction failed on-chain" });
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
    if ((milestoneEvent.args.workHash || "") !== (workHash || "")) {
      return res.status(400).json({ message: "Submission transaction workHash does not match" });
    }

    milestone.status = "Submitted";
    if (amount) milestone.amount = amount;
    if (title) milestone.title = title;
    if (deadline) milestone.deadline = deadline;
    milestone.workHash = workHash;
    milestone.ipfsHash = ipfsHash;
    milestone.submitTxHash = receipt.hash;
    await milestone.save();

    await Transaction.create({
      projectId,
      milestoneId,
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
  const { projectId, milestoneId } = req.body;
  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) return res.status(404).json({ message: "Milestone not found" });
  if (milestone.status === "Paid") return res.status(400).json({ message: "Milestone already paid" });
  if (milestone.status !== "Submitted") return res.status(400).json({ message: "Milestone must be submitted before approval" });
  const project = await Project.findById(projectId);

  const tx = await approveMilestoneOnChain({
    projectId: project.contractProjectId,
    milestoneId: milestone.contractMilestoneId,
  });
  const receipt = await tx.wait();

  milestone.status = "Approved";
  milestone.approveTxHash = receipt.hash;
  await milestone.save();

  await Transaction.create({
    projectId,
    milestoneId,
    amount: Number(milestone.amount),
    txHash: receipt.hash,
    status: "Completed",
    action: "approveMilestone",
    userId: req.user._id,
  });

  // Auto-release payment after approval
  const payTx = await releasePaymentOnChain({
    projectId: project.contractProjectId,
    milestoneId: milestone.contractMilestoneId,
  });
  const payReceipt = await payTx.wait();

  milestone.status = "Paid";
  milestone.payTxHash = payReceipt.hash;
  await milestone.save();
  project.remainingBalance = Math.max(project.remainingBalance - Number(milestone.amount), 0);
  await project.save();

  await Transaction.create({
    projectId,
    milestoneId,
    amount: Number(milestone.amount),
    txHash: payReceipt.hash,
    status: "Completed",
    action: "releasePayment",
    userId: req.user._id,
  });

  res.json({ milestone, approveTx: receipt.hash, payTx: payReceipt.hash });
};

export const releasePayment = async (req, res) => {
  const { projectId, milestoneId, amount } = req.body;
  const milestone = await Milestone.findById(milestoneId);
  const project = await Project.findById(projectId);
  if (!milestone || !project) return res.status(404).json({ message: "Not found" });
  const numericAmount = Number(amount || milestone.amount);

  const tx = await releasePaymentOnChain({
    projectId: project.contractProjectId,
    milestoneId: milestone.contractMilestoneId,
  });
  const receipt = await tx.wait();

  milestone.status = "Paid";
  milestone.payTxHash = receipt.hash;
  await milestone.save();
  project.remainingBalance = Math.max(project.remainingBalance - numericAmount, 0);
  await project.save();

  const txDoc = await Transaction.create({
    projectId,
    milestoneId,
    amount: numericAmount,
    txHash: receipt.hash,
    status: "Completed",
    action: "releasePayment",
    userId: req.user._id,
  });

  res.json({ milestone, transaction: txDoc });
};

export const listByProject = async (req, res) => {
  const milestones = await Milestone.find({ projectId: req.params.projectId });
  res.json(milestones);
};
