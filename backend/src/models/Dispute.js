import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone" },
    reason: { type: String, required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["Open", "Resolved", "Refunded"], default: "Open" },
    resolution: String,
    raiseTxHash: String,
    resolveTxHash: String,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    comments: [
      {
        text: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        replyTo: { type: mongoose.Schema.Types.ObjectId },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    evidence: [
      {
        ipfsHash: String,
        filename: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Dispute = mongoose.model("Dispute", disputeSchema);
export default Dispute;
