import React, { useState } from "react";
import { approveMilestone, releaseMilestonePayment } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const statusColors = {
  Pending: "bg-slate-700 text-slate-200",
  Submitted: "bg-yellow-900 text-yellow-200",
  Approved: "bg-green-900 text-green-200",
  Paid: "bg-emerald-900 text-emerald-200",
  Disputed: "bg-red-900 text-red-200",
};

const etherscanTx = (hash) =>
  hash ? `${import.meta.env.VITE_ETHERSCAN_BASE || "https://sepolia.etherscan.io"}/tx/${hash}` : null;

const MilestoneCard = ({ milestone, onUpdated }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [item, setItem] = useState(milestone);
  const [loading, setLoading] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [error, setError] = useState("");

  const canApprove = user?.role && ["client", "admin"].includes(user.role) && item.status === "Submitted";
  const canRelease = user?.role && ["client", "admin"].includes(user.role) && item.status === "Approved";

  const applyUpdate = (updated) => {
    const merged = { ...item, ...updated };
    setItem(merged);
    if (typeof onUpdated === "function") {
      onUpdated(merged);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await approveMilestone({
        projectId: item.projectId?._id || item.projectId,
        milestoneId: item._id,
      });
      const updated = res.milestone || res;
      applyUpdate(updated);
      addToast("Milestone approved", "success");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Approval failed. Check status or try again.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    setReleaseLoading(true);
    setError("");
    try {
      const res = await releaseMilestonePayment({
        projectId: item.projectId?._id || item.projectId,
        milestoneId: item._id,
      });
      const updated = res.milestone || res;
      applyUpdate(updated);
      addToast("Payment released", "success");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Payment release failed. Try again.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setReleaseLoading(false);
    }
  };

  return (
    <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/70">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">{item.title}</h4>
        <span className={`text-xs px-2 py-1 rounded ${statusColors[item.status] || "bg-slate-700"}`}>
          {item.status}
        </span>
      </div>
      <p className="text-sm text-slate-400">{item.description}</p>
      <div className="text-xs text-slate-500 mt-1">Milestone ID: {item._id}</div>
      {item.projectId && (
        <div className="text-xs text-slate-500">Project ID: {item.projectId._id || item.projectId}</div>
      )}
      <div className="text-sm mt-2 text-slate-300">Amount: {item.amount} ETH</div>
      <div className="text-xs text-slate-500 space-y-1 mt-2">
        {item.submitTxHash && (
          <a className="text-primary underline" href={etherscanTx(item.submitTxHash)} target="_blank" rel="noreferrer">
            Submission tx
          </a>
        )}
        {item.approveTxHash && (
          <a className="block text-primary underline" href={etherscanTx(item.approveTxHash)} target="_blank" rel="noreferrer">
            Approval tx
          </a>
        )}
        {item.payTxHash && (
          <a className="block text-primary underline" href={etherscanTx(item.payTxHash)} target="_blank" rel="noreferrer">
            Payment tx
          </a>
        )}
      </div>
      {item.ipfsHash && (
        <a
          className="text-xs text-primary underline"
          href={`https://ipfs.io/ipfs/${item.ipfsHash}`}
          target="_blank"
          rel="noreferrer"
        >
          View proof
        </a>
      )}
      {canApprove && (
        <div className="mt-3 space-y-2">
          <button
            className="bg-primary px-3 py-2 rounded text-sm disabled:opacity-60"
            type="button"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? "Approving..." : "Approve milestone"}
          </button>
        </div>
      )}
      {canRelease && (
        <div className="mt-3 space-y-2">
          <button
            className="bg-emerald-500/90 px-3 py-2 rounded text-sm text-slate-950 font-semibold disabled:opacity-60"
            type="button"
            onClick={handleRelease}
            disabled={releaseLoading}
          >
            {releaseLoading ? "Releasing..." : "Release payment"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-amber-300 mt-2">{error}</p>}
    </div>
  );
};

export default MilestoneCard;
