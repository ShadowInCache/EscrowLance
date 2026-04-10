import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { submitMilestone, fetchProjects, listMilestones, uploadProofFile } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const SubmitMilestone = () => {
  const [form, setForm] = useState({ projectId: "", milestoneId: "", workHash: "", ipfsHash: "" });
  const [message, setMessage] = useState(null);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const { user } = useAuth();
  const { addToast } = useToast();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onChainProjects = projects.filter(
    (p) => p.contractProjectId !== undefined && p.contractProjectId !== null
  );
  const offChainProjectsCount = Math.max(projects.length - onChainProjects.length, 0);

  const selectedMilestone = milestones.find((m) => m._id === form.milestoneId);
  const selectedStatus = selectedMilestone?.status || "Pending";

  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!form.projectId) {
        setMilestones([]);
        return;
      }
      const data = await listMilestones(form.projectId);
      setMilestones(data);
    };
    load().catch(console.error);
  }, [form.projectId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.projectId || !form.milestoneId) {
      setError("Select a project and milestone first");
      return;
    }
    const target = milestones.find((m) => m._id === form.milestoneId);
    if (target && target.status !== "Pending") {
      setError("Only Pending milestones can be submitted.");
      return;
    }
    setLoading(true);
    try {
      const data = await submitMilestone({ ...form, milestoneId: form.milestoneId });
      setMessage(`Submitted milestone ${data._id || form.milestoneId}`);
      addToast("Milestone submitted", "success");
    } catch (err) {
      console.error("Submit error:", err);
      const msg = err?.response?.data?.message || err?.message || "Submission failed. Check status or try again.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async () => {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await uploadProofFile(file);
      setForm((prev) => ({ ...prev, ipfsHash: res.ipfsHash }));
      setMessage(`Uploaded proof: ${res.ipfsHash}`);
      addToast("Proof uploaded to IPFS", "success");
    } catch (err) {
      console.error("Upload error:", err);
      const msg = err?.response?.data?.message || err?.message || "Upload failed. Try again.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-50">
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold">Milestone delivery</p>
            <h1 className="text-2xl font-semibold leading-tight">Submit proof and request payout</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Pick your project, attach proof, and send the milestone for approval. We will only allow pending milestones to be submitted.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-700 px-3 py-1 bg-slate-950/60">Projects loaded: {onChainProjects.length}</span>
              <span className="rounded-full border border-slate-700 px-3 py-1 bg-slate-950/60">Milestones: {milestones.length || "-"}</span>
              <span className="rounded-full border border-slate-700 px-3 py-1 bg-slate-950/60">Status: {selectedStatus}</span>
            </div>
            {offChainProjectsCount > 0 && (
              <div className="text-xs text-amber-300 flex items-center gap-2 flex-wrap">
                <span>{offChainProjectsCount} project(s) are not deployed on-chain yet and cannot be submitted.</span>
                <Link className="underline text-amber-200 hover:text-amber-100" to="/projects">
                  Open Projects to deploy them.
                </Link>
              </div>
            )}
          </div>
          {selectedMilestone && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 w-full max-w-xs">
              <p className="text-xs text-slate-400 uppercase mb-2">Selected milestone</p>
              <div className="text-sm font-semibold text-slate-100">{selectedMilestone.title}</div>
              <div className="mt-2 text-sm text-slate-300 flex items-center justify-between">
                <span>Amount</span>
                <span className="font-semibold">{selectedMilestone.amount ? `${selectedMilestone.amount} ETH` : "-"}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">Status: {selectedStatus}</div>
              {form.ipfsHash && (
                <a
                  className="mt-3 inline-block text-xs text-primary underline"
                  href={`https://ipfs.io/ipfs/${form.ipfsHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View uploaded proof
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-600 bg-amber-900/40 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-600 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-50">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <form className="lg:col-span-2 space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-200">Project</span>
              <select
                className="w-full bg-slate-800 px-3 py-2 rounded text-sm border border-slate-700 focus:border-primary focus:outline-none"
                name="projectId"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value, milestoneId: "" })}
              >
                <option value="">Select project</option>
                {onChainProjects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title} ({p.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-200">Milestone</span>
              <select
                className="w-full bg-slate-800 px-3 py-2 rounded text-sm border border-slate-700 focus:border-primary focus:outline-none"
                name="milestoneId"
                value={form.milestoneId}
                onChange={(e) => setForm({ ...form, milestoneId: e.target.value })}
                disabled={!form.projectId || !milestones.length}
              >
                <option value="">Select milestone</option>
                {milestones.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title} - {m.amount} ETH
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm block">
            <span className="text-slate-200">Work hash (reference)</span>
            <input
              className="w-full bg-slate-800 px-3 py-2 rounded border border-slate-700 focus:border-primary focus:outline-none"
              name="workHash"
              placeholder="Enter IPFS CID or other proof reference"
              onChange={onChange}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm block">
              <span className="text-slate-200">Upload proof (optional)</span>
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-3 flex flex-col gap-3">
                <input
                  className="w-full bg-slate-900 px-3 py-2 rounded text-sm border border-slate-800"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className="flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    className="bg-primary/90 hover:bg-primary text-slate-950 font-semibold px-3 py-2 rounded disabled:opacity-60"
                    onClick={onUpload}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload to IPFS"}
                  </button>
                  {form.ipfsHash && (
                    <a className="text-primary underline" href={`https://ipfs.io/ipfs/${form.ipfsHash}`} target="_blank" rel="noreferrer">
                      View proof
                    </a>
                  )}
                </div>
                <input
                  className="w-full bg-slate-900 px-3 py-2 rounded border border-slate-800"
                  name="ipfsHash"
                  placeholder="Or paste an existing IPFS hash"
                  value={form.ipfsHash}
                  onChange={onChange}
                />
              </div>
            </label>

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Status</span>
                <span className="rounded-full px-3 py-1 border border-slate-700 bg-slate-900/80 text-xs">{selectedStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Amount</span>
                <span className="font-semibold">{selectedMilestone?.amount ? `${selectedMilestone.amount} ETH` : "-"}</span>
              </div>
              <p className="text-xs text-slate-400">
                Only pending milestones can be submitted. After submission, the client must approve to release funds.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400">Signed in as {user?.email || "your account"}</div>
            <button className="bg-primary hover:bg-primary/90 text-slate-950 font-semibold px-4 py-2 rounded disabled:opacity-60" type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit milestone"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Checklist</p>
            <p className="text-slate-100 font-semibold">Before you submit</p>
            <ul className="space-y-1 text-slate-300 list-disc list-inside">
              <li>Pick the correct project and milestone.</li>
              <li>Attach IPFS proof or add a reference hash.</li>
              <li>Confirm the milestone is still pending.</li>
              <li>Let the client know to review and approve.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tips</p>
            <ul className="space-y-1 text-slate-300 list-disc list-inside">
              <li>Keep proofs small; use IPFS hashes instead of heavy files.</li>
              <li>Double-check budget alignment with the milestone amount.</li>
              <li>Share the proof link with your client for faster approval.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitMilestone;
