import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchProject, listMilestones, listProjectTransactions, listFreelancers, assignFreelancerApi, deleteProject, deployProject } from "../../services/api.js";
import MilestoneCard from "../../components/MilestoneCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [assignSel, setAssignSel] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    fetchProject(id).then(setProject).catch(console.error);
    listMilestones(id).then(setMilestones).catch(console.error);
    listProjectTransactions(id).then(setTransactions).catch(console.error);
    listFreelancers().then(setFreelancers).catch(console.error);
  }, [id]);

  const etherscanTx = (hash) =>
    hash ? `${import.meta.env.VITE_ETHERSCAN_BASE || "https://sepolia.etherscan.io"}/tx/${hash}` : null;

  const activity = useMemo(() => {
    const mileMap = Object.fromEntries(milestones.map((m) => [m._id, m]));
    return transactions.map((t) => ({
      ...t,
      milestoneTitle: t.milestoneId ? mileMap[t.milestoneId]?.title : undefined,
    }));
  }, [transactions, milestones]);

  const onAssign = async () => {
    if (!assignSel) {
      setError("Select a freelancer");
      return;
    }
    const picked = freelancers.find((f) => f._id === assignSel);
    if (!picked) {
      setError("Invalid freelancer");
      return;
    }
    setAssignLoading(true);
    setError("");
    try {
      const updated = await assignFreelancerApi(id, { freelancerWallet: picked.walletAddress, freelancerId: picked._id });
      setProject(updated);
    } catch (err) {
      console.error(err);
      setError("Assignment failed. Try again.");
    } finally {
      setAssignLoading(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete project "${project.title}"? This cannot be undone.`)) return;
    setDeleteLoading(true);
    try {
      await deleteProject(id);
      addToast("Project deleted", "success");
      navigate("/projects");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err.message || "Delete failed";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const onDeploy = async () => {
    setDeployLoading(true);
    setError("");
    try {
      const updated = await deployProject(id);
      setProject(updated);
      addToast("Project deployed on-chain", "success");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err.message || "Deployment failed";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setDeployLoading(false);
    }
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{project.title}</h3>
            <p className="text-slate-400">{project.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm px-2 py-1 rounded ${project.contractProjectId ? "bg-emerald-900/50 text-emerald-200" : "bg-amber-900/50 text-amber-100"}`}>
              {project.contractProjectId ? `On-chain #${project.contractProjectId}` : "Not deployed"}
            </span>
            <span className="text-sm px-2 py-1 bg-slate-800 rounded">{project.status}</span>
            {(user?.role === "client" || user?.role === "admin") && ["Created", "Cancelled"].includes(project.status) && (
              <button
                onClick={onDelete}
                disabled={deleteLoading}
                className="text-sm px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        </div>
        <div className="text-sm text-slate-400 mt-2">Budget: {project.budget} ETH</div>
        {!project.contractProjectId && (user?.role === "client" || user?.role === "admin") && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-amber-700/50 bg-amber-950/30 px-4 py-3">
            <div className="text-sm text-amber-100">
              This project exists in the database but has not been deployed on-chain yet.
            </div>
            <button
              type="button"
              onClick={onDeploy}
              disabled={deployLoading}
              className="rounded bg-primary px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {deployLoading ? "Deploying..." : "Deploy on-chain"}
            </button>
          </div>
        )}
        {project.freelancerId ? (
          <div className="text-sm text-slate-300 mt-1">Freelancer assigned</div>
        ) : (
          user?.role && ["client", "admin"].includes(user.role) && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-slate-300">Assign freelancer</p>
              <select
                className="w-full bg-slate-800 px-3 py-2 rounded text-sm"
                value={assignSel}
                onChange={(e) => setAssignSel(e.target.value)}
              >
                <option value="">Select freelancer</option>
                {freelancers.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} — {f.email}
                  </option>
                ))}
              </select>
              <button
                className="bg-primary px-3 py-2 rounded text-sm disabled:opacity-60"
                type="button"
                onClick={onAssign}
                disabled={assignLoading}
              >
                {assignLoading ? "Assigning..." : "Assign"}
              </button>
              {error && <p className="text-xs text-amber-300">{error}</p>}
            </div>
          )
        )}
      </div>

      <section>
        <h4 className="font-semibold mb-2">Milestones</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {milestones.map((m) => (
            <MilestoneCard key={m._id} milestone={m} />
          ))}
          {!milestones.length && <p className="text-slate-400">No milestones yet.</p>}
        </div>
      </section>

      <section>
        <h4 className="font-semibold mb-2">Activity</h4>
        <div className="space-y-2">
          {activity.map((a) => (
            <div key={a._id} className="border border-slate-800 rounded p-3 bg-slate-900/70">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-200">{a.action}</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-800">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              {a.milestoneTitle && <div className="text-xs text-slate-400">Milestone: {a.milestoneTitle}</div>}
              {a.amount ? <div className="text-xs text-slate-400">Amount: {a.amount} ETH</div> : null}
              {a.txHash && (
                <a className="text-xs text-primary underline" href={etherscanTx(a.txHash)} target="_blank" rel="noreferrer">
                  Tx: {a.txHash}
                </a>
              )}
            </div>
          ))}
          {!activity.length && <p className="text-slate-400 text-sm">No activity yet.</p>}
        </div>
      </section>
    </div>
  );
};

export default ProjectDetails;
