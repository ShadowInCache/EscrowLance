import Dispute from "../models/Dispute.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import Transaction from "../models/Transaction.js";
import {
  raiseDisputeOnChain,
  resolveDisputeOnChain,
} from "../services/blockchainService.js";

const DISPUTE_POPULATE = [
  {
    path: "projectId",
    select: "title status clientId freelancerId contractProjectId",
    populate: [
      { path: "clientId", select: "name email role" },
      { path: "freelancerId", select: "name email role" },
    ],
  },
  { path: "milestoneId", select: "title amount status" },
  { path: "raisedBy", select: "name email role" },
  { path: "comments.user", select: "name email role" },
  { path: "evidence.uploadedBy", select: "name email role" },
];

const applyDisputePopulate = (query) => {
  DISPUTE_POPULATE.forEach((populateConfig) => {
    query.populate(populateConfig);
  });
  return query;
};

const isProjectParticipant = (project, userId) => {
  const normalizedUserId = String(userId);
  return [project?.clientId, project?.freelancerId].some(
    (memberId) => memberId && String(memberId) === normalizedUserId
  );
};

const getPopulatedDisputeById = async (id) =>
  applyDisputePopulate(Dispute.findById(id)).exec();

export const listDisputes = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== "admin") {
      const linkedProjects = await Project.find({
        $or: [{ clientId: req.user._id }, { freelancerId: req.user._id }],
      }).select("_id");

      const projectIds = linkedProjects.map((project) => project._id);
      if (!projectIds.length) {
        return res.json([]);
      }

      filter.projectId = { $in: projectIds };
    }

    const disputes = await applyDisputePopulate(Dispute.find(filter))
      .sort({ createdAt: -1 })
      .exec();

    return res.json(disputes);
  } catch (err) {
    console.error("listDisputes error:", err.message, err.stack);
    return res.status(500).json({ message: "Failed to load disputes" });
  }
};

export const createDispute = async (req, res) => {
  try {
    const { projectId, milestoneId, reason } = req.body;
    if (!projectId) {
      return res.status(400).json({ message: "Project is required" });
    }

    const normalizedReason = reason?.trim();
    if (!normalizedReason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (req.user.role !== "admin" && !isProjectParticipant(project, req.user._id)) {
      return res.status(403).json({ message: "Only project participants can raise disputes" });
    }

    if (project.contractProjectId === undefined || project.contractProjectId === null) {
      return res.status(400).json({ message: `Project not deployed on-chain yet. Missing contractProjectId. Project ID: ${project._id}` });
    }

    if (milestoneId) {
      const milestone = await Milestone.findById(milestoneId).select("projectId status");
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      if (String(milestone.projectId) !== String(project._id)) {
        return res.status(400).json({ message: "Milestone does not belong to this project" });
      }
    }

    const existingOpenDispute = await Dispute.findOne({
      projectId,
      status: "Open",
    });
    if (existingOpenDispute) {
      return res.status(409).json({ message: "This project already has an open dispute" });
    }

    console.log(`Raising dispute for project ${projectId} (contract ID: ${project.contractProjectId})`);
    const tx = await raiseDisputeOnChain({ projectId: project.contractProjectId, reason: normalizedReason });
    console.log(`Dispute tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Dispute tx mined: ${receipt.hash}`);

    const dispute = await Dispute.create({
      projectId,
      milestoneId,
      reason: normalizedReason,
      raisedBy: req.user._id,
      raiseTxHash: receipt.hash,
    });

    if (milestoneId) {
      await Milestone.findByIdAndUpdate(milestoneId, { status: "Disputed" });
    }

    project.status = "Disputed";
    await project.save();

    await Transaction.create({
      projectId,
      milestoneId,
      disputeId: dispute._id,
      txHash: receipt.hash,
      status: "Completed",
      action: "raiseDispute",
      userId: req.user._id,
    });

    const fullDispute = await getPopulatedDisputeById(dispute._id);
    res.status(201).json(fullDispute);
  } catch (err) {
    console.error("createDispute error:", err.message, err.stack);
    res.status(500).json({ message: `Dispute creation failed: ${err.message}` });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const { projectId, disputeId, refundClient, resolution } = req.body;
    if (!projectId && !disputeId) {
      return res.status(400).json({ message: "projectId or disputeId is required" });
    }

    const normalizedResolution = resolution?.trim();
    if (!normalizedResolution) {
      return res.status(400).json({ message: "Resolution summary is required" });
    }

    let dispute = null;
    if (disputeId) {
      dispute = await Dispute.findById(disputeId);
    } else {
      dispute = await Dispute.findOne({ projectId, status: "Open" }).sort({ createdAt: -1 });
    }

    if (!dispute) {
      return res.status(404).json({ message: "Open dispute not found" });
    }
    if (dispute.status !== "Open") {
      return res.status(400).json({ message: "Dispute is already closed" });
    }

    const project = await Project.findById(dispute.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (req.user.role !== "admin" && !isProjectParticipant(project, req.user._id)) {
      return res.status(403).json({ message: "Only project participants can resolve disputes" });
    }

    if (project.contractProjectId === undefined || project.contractProjectId === null) {
      return res.status(400).json({ message: "Project is not deployed on-chain" });
    }

    const shouldRefundClient =
      typeof refundClient === "string"
        ? refundClient.toLowerCase() === "true"
        : Boolean(refundClient);
    const tx = await resolveDisputeOnChain({
      projectId: project.contractProjectId,
      refundClient: shouldRefundClient,
    });
    const receipt = await tx.wait();

    dispute.status = shouldRefundClient ? "Refunded" : "Resolved";
    dispute.resolution = normalizedResolution;
    dispute.resolveTxHash = receipt.hash;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    project.status = shouldRefundClient ? "Refunded" : "Completed";
    await project.save();

    await Transaction.create({
      projectId: project._id,
      disputeId: dispute._id,
      txHash: receipt.hash,
      status: "Completed",
      action: "resolveDispute",
      userId: req.user._id,
    });

    const fullDispute = await getPopulatedDisputeById(dispute._id);
    return res.json({ message: "Dispute resolved", txHash: receipt.hash, dispute: fullDispute });
  } catch (err) {
    console.error("resolveDispute error:", err.message, err.stack);
    return res.status(500).json({ message: `Dispute resolution failed: ${err.message}` });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, replyTo } = req.body;
    const normalizedText = text?.trim();

    if (!normalizedText) {
      return res.status(400).json({ message: "Comment text required" });
    }

    const dispute = await Dispute.findById(id).populate("projectId", "clientId freelancerId");
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });

    if (req.user.role !== "admin" && !isProjectParticipant(dispute.projectId, req.user._id)) {
      return res.status(403).json({ message: "Only project participants can comment" });
    }

    if (replyTo) {
      const parentComment = dispute.comments.id(replyTo);
      if (!parentComment) {
        return res.status(400).json({ message: "Reply target comment not found" });
      }
    }

    dispute.comments.push({
      text: normalizedText,
      user: req.user._id,
      replyTo: replyTo || undefined,
    });
    await dispute.save();

    const fullDispute = await getPopulatedDisputeById(dispute._id);
    return res.json(fullDispute);
  } catch (err) {
    console.error("addComment error:", err.message, err.stack);
    return res.status(500).json({ message: "Failed to add comment" });
  }
};

export const addEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { ipfsHash, filename } = req.body;
    const normalizedHash = ipfsHash?.trim();
    if (!normalizedHash) return res.status(400).json({ message: "ipfsHash required" });

    const dispute = await Dispute.findById(id).populate("projectId", "clientId freelancerId");
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });

    if (req.user.role !== "admin" && !isProjectParticipant(dispute.projectId, req.user._id)) {
      return res.status(403).json({ message: "Only project participants can upload evidence" });
    }

    dispute.evidence.push({
      ipfsHash: normalizedHash,
      filename: filename?.trim() || normalizedHash,
      uploadedBy: req.user._id,
    });
    await dispute.save();

    const fullDispute = await getPopulatedDisputeById(dispute._id);
    return res.json(fullDispute);
  } catch (err) {
    console.error("addEvidence error:", err.message, err.stack);
    return res.status(500).json({ message: "Failed to add evidence" });
  }
};
