import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, listFreelancers } from "../../services/api.js";
import { useToast } from "../../context/ToastContext.jsx";

const newMilestone = () => ({ title: "", description: "", amount: "", deadline: "" });

const CreateProject = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", budget: "", deadline: "", freelancerId: "" });
  const [milestones, setMilestones] = useState([newMilestone()]);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [freelancers, setFreelancers] = useState([]);

  const milestoneTotal = useMemo(
    () => milestones.reduce((acc, m) => acc + Number(m.amount || 0), 0),
    [milestones]
  );
  const budgetNumber = Number(form.budget || 0);
  const budgetDelta = budgetNumber - milestoneTotal;
  const budgetMatches = budgetNumber > 0 && Math.abs(budgetDelta) < 1e-9;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const updateMilestone = (idx, key, value) => {
    const copy = [...milestones];
    copy[idx][key] = value;
    setMilestones(copy);
  };

  const addMilestone = () => setMilestones([...milestones, newMilestone()]);
  const removeMilestone = (idx) => {
    if (milestones.length === 1) return;
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    listFreelancers().then(setFreelancers).catch(console.error);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!form.title || !form.description || !form.budget) {
      setMessageType("error");
      setMessage("Title, description, and budget are required");
      return;
    }
    if (budgetNumber <= 0) {
      setMessageType("error");
      setMessage("Budget must be greater than 0");
      return;
    }
    if (form.deadline && new Date(form.deadline) < new Date()) {
      setMessageType("error");
      setMessage("Deadline must be in the future");
      return;
    }
    if (!budgetMatches) {
      setMessageType("error");
      setMessage("Milestone total must equal budget");
      return;
    }

    const invalidMilestone = milestones.find((m) => !m.title || Number(m.amount || 0) <= 0);
    if (invalidMilestone) {
      setMessageType("error");
      setMessage("Each milestone needs a title and amount greater than 0.");
      return;
    }

    const payload = {
      ...form,
      budget: budgetNumber,
      milestones: milestones.map((m) => ({
        ...m,
        amount: Number(m.amount),
      })),
    };

    if (!String(form.freelancerId || "").trim()) {
      delete payload.freelancerId;
    } else {
      payload.freelancerId = String(form.freelancerId).trim();
    }

    setLoading(true);
    try {
      const res = await createProject(payload);
      setMessageType("success");
      setMessage(`Project created with id ${res.project._id}`);
      addToast("Project created", "success");
      navigate(`/projects/${res.project._id}`);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err.message || "Project creation failed";
      setMessageType("error");
      setMessage(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary/20 via-slate-900 to-slate-900 border border-primary/30 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-primary/80">Create</p>
            <h1 className="text-2xl font-semibold text-slate-50 mt-1">Launch a new project</h1>
            <p className="text-sm text-slate-300 mt-1">Scope, budget, milestones, and who should deliver.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${budgetMatches ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30" : "bg-amber-500/15 text-amber-200 border border-amber-400/40"}`}>
              {budgetMatches ? "Budget aligned" : "Align budget & milestones"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-200">
              {milestones.length} milestone{milestones.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-5 shadow-lg shadow-black/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">Project details</h3>
                  <p className="text-sm text-slate-400">Tell us what you need built.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-300">Title</label>
                  <input
                    className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 border border-slate-700 focus:border-primary outline-none"
                    name="title"
                    placeholder="e.g. Build escrow-enabled marketplace"
                    value={form.title}
                    onChange={onChange}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Description</label>
                  <textarea
                    className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 border border-slate-700 focus:border-primary outline-none"
                    name="description"
                    placeholder="What needs to be delivered, key requirements, stack preferences."
                    rows={4}
                    value={form.description}
                    onChange={onChange}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300">Total budget (ETH)</label>
                    <input
                      className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 border border-slate-700 focus:border-primary outline-none"
                      name="budget"
                      placeholder="0.50"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.budget}
                      onChange={onChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300">Project deadline</label>
                    <input
                      className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 border border-slate-700 focus:border-primary outline-none"
                      type="date"
                      name="deadline"
                      value={form.deadline}
                      onChange={onChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-300">Assign freelancer (optional)</label>
                  <select
                    className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 border border-slate-700 focus:border-primary outline-none"
                    name="freelancerId"
                    value={form.freelancerId}
                    onChange={onChange}
                  >
                    <option value="">Select freelancer</option>
                    {freelancers.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} — {f.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-5 shadow-lg shadow-black/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">Milestones</h3>
                  <p className="text-sm text-slate-400">Break work into payable steps.</p>
                </div>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="text-sm font-medium px-3 py-2 rounded-lg bg-primary text-slate-950 hover:opacity-90"
                >
                  + Add milestone
                </button>
              </div>

              <div className="space-y-4">
                {milestones.map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-200 font-semibold">
                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10">#{idx + 1}</span>
                        <span>Milestone</span>
                      </div>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(idx)}
                          className="text-xs text-rose-200 hover:text-rose-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 border border-slate-700 focus:border-primary outline-none"
                          placeholder="Title"
                          value={m.title}
                          onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                        />
                        <input
                          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 border border-slate-700 focus:border-primary outline-none"
                          placeholder="Description"
                          value={m.description}
                          onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input
                          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 border border-slate-700 focus:border-primary outline-none"
                          placeholder="Amount (ETH)"
                          value={m.amount}
                          type="number"
                          step="0.01"
                          min="0"
                          onChange={(e) => updateMilestone(idx, "amount", e.target.value)}
                        />
                        <input
                          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 border border-slate-700 focus:border-primary outline-none"
                          type="date"
                          placeholder="Deadline"
                          value={m.deadline}
                          onChange={(e) => updateMilestone(idx, "deadline", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="bg-primary px-5 py-2.5 rounded-lg text-slate-950 font-semibold hover:opacity-90 disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create project"}
              </button>
              {message && (
                <p className={`text-sm ${messageType === "error" ? "text-rose-400" : "text-emerald-400"}`}>{message}</p>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-5 py-5 shadow-lg shadow-black/10 space-y-3">
            <h4 className="text-sm font-semibold text-slate-100">Budget alignment</h4>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Total budget</span>
              <span className="font-semibold text-slate-50">{budgetNumber || 0} ETH</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Milestones total</span>
              <span className="font-semibold text-slate-50">{milestoneTotal || 0} ETH</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Delta</span>
              <span className={budgetMatches ? "text-emerald-300" : "text-amber-300"}>{budgetDelta.toFixed(2)} ETH</span>
            </div>
            <div className={`mt-2 text-xs px-3 py-2 rounded-lg border ${budgetMatches ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-amber-500/30 bg-amber-500/10 text-amber-100"}`}>
              {budgetMatches ? "Ready to submit" : "Match milestones to the total budget before submitting."}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-5 py-5 shadow-lg shadow-black/10 space-y-3 text-sm text-slate-200">
            <h4 className="text-sm font-semibold text-slate-100">Demo tips</h4>
            <ul className="list-disc list-inside space-y-2 text-slate-300">
              <li>Keep milestones small so payouts are quick to verify.</li>
              <li>Set a future deadline; past dates are blocked.</li>
              <li>Assign a freelancer now or later; both flows work.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
