import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { fetchProjects } from "../../services/api.js";

const statusTone = {
  Created: "bg-slate-800 text-slate-200",
  Funded: "bg-emerald-900/50 text-emerald-200",
  InProgress: "bg-blue-900/50 text-blue-100",
  Submitted: "bg-amber-900/50 text-amber-100",
  Completed: "bg-emerald-950 text-emerald-200",
  Cancelled: "bg-slate-800 text-slate-400",
  Disputed: "bg-rose-900/60 text-rose-100",
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const { user } = useAuth();
  const role = user?.role?.toLowerCase?.();
  const isClient = role === "client";

  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
  }, []);

  const stats = useMemo(() => {
    const total = projects.length;
    const activeStatuses = ["Created", "Funded", "InProgress", "Submitted"];
    const active = projects.filter((p) => activeStatuses.includes(p.status)).length;
    const disputed = projects.filter((p) => p.status === "Disputed").length;
    const completed = projects.filter((p) => p.status === "Completed").length;
    const budgetSum = projects.reduce((sum, p) => {
      const n = Number(p.budget);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    return { total, active, disputed, completed, budgetSum };
  }, [projects]);

  const formatBudget = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return val ?? "—";
    return `${n < 1 ? n.toFixed(3) : n.toFixed(2)} ETH`;
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  const pill = (status) => statusTone[status] ?? "bg-slate-800 text-slate-200";

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-800 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Pipeline</p>
            <h1 className="text-2xl font-semibold text-white">Projects cockpit</h1>
            <p className="text-slate-300 max-w-2xl">
              Track every project’s budget, status, and assignment in one place. Start a fresh brief or jump into an active
              build with clear status signals.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isClient && (
              <Link
                to="/projects/new"
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition"
              >
                Create project
              </Link>
            )}
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-100 hover:border-primary/80 transition"
            >
              View dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase">Total projects</p>
          <div className="text-2xl font-semibold text-white">{stats.total}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase">Active</p>
          <div className="text-2xl font-semibold text-white">{stats.active}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase">Disputed</p>
          <div className="text-2xl font-semibold text-white">{stats.disputed}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase">Budget in play</p>
          <div className="text-xl font-semibold text-white">{formatBudget(stats.budgetSum)}</div>
          <p className="text-xs text-slate-400">Completed: {stats.completed}</p>
        </div>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Projects</h2>
          <div className="text-xs text-slate-400">Newest first</div>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border border-dashed border-slate-700 rounded-lg p-6 bg-slate-900/40">
            <p className="text-slate-300">
              {isClient
                ? "No projects yet. Use the Create project action above to spin up your first brief and milestones."
                : "No projects yet. Projects assigned to you will appear here once a client adds you."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map((p) => (
              <Link
                key={p._id}
                to={`/projects/${p._id}`}
                className="flex flex-col gap-3 border border-slate-800 rounded-lg p-4 bg-slate-900/70 hover:border-primary/80 hover:-translate-y-[1px] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">{formatDate(p.createdAt)}</p>
                    <h3 className="text-lg font-semibold text-white line-clamp-2">{p.title || "Untitled project"}</h3>
                    <p className="text-sm text-slate-300 line-clamp-2">{p.description || "No description provided."}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${pill(p.status)}`}>
                    {p.status || "Unknown"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Budget</p>
                    <p className="font-semibold">{formatBudget(p.budget)}</p>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Freelancer</p>
                    <p className="font-semibold truncate">
                      {p.freelancerName || p.freelancerWallet || (p.freelancerId ? "Assigned" : "Unassigned")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{p.clientWallet || "Client wallet pending"}</span>
                  <span className="text-primary font-medium">View details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
