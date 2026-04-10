import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/StatCard.jsx";
import { fetchProjects, listTransactions } from "../../services/api.js";
import MilestoneCard from "../../components/MilestoneCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const { user } = useAuth();
  const canCreateProject = user?.role === "client" || user?.role === "admin";

  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
    listTransactions().then(setTransactions).catch(console.error);
  }, []);

  const activeMilestones = projects
    .flatMap((p) =>
      (p.milestones || []).map((m) => ({ ...m, projectId: p._id, projectTitle: p.title }))
    )
    .slice(0, 4);

  const totals = useMemo(() => {
    const budget = projects.reduce((sum, p) => sum + Number(p.budget || 0), 0);
    const funded = projects.filter((p) => p.funded).length;
    const inFlight = projects.filter((p) => ["InProgress", "Submitted", "Funded"].includes(p.status)).length;
    return { budget, funded, inFlight };
  }, [projects]);

  const spotlightProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    return sorted.slice(0, 3);
  }, [projects]);

  const recentTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return sorted.slice(0, 5);
  }, [transactions]);

  const formatEth = (value) => {
    const n = Number(value || 0);
    return `${n.toFixed(3)} ETH`;
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-primary/20 via-slate-900 to-slate-950 p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Command center</p>
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-semibold">Your escrow pipeline at a glance</h1>
              <p className="text-slate-300 max-w-2xl">
                Track project health, milestone momentum, and on-chain activity. Prep a demo by aligning budget vs milestones and
                sending a fresh payment.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canCreateProject && (
                <Link
                  to="/projects/new"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-primary/50 transition"
                >
                  Create project
                </Link>
              )}
              <Link
                to="/transactions"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-primary hover:text-primary transition"
              >
                View transactions
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <div className="rounded-xl border border-primary/30 bg-slate-950/60 px-3 py-3">
              <p className="text-xs text-slate-400">Total budget</p>
              <p className="text-lg font-semibold">{formatEth(totals.budget)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
              <p className="text-xs text-slate-400">Projects funded</p>
              <p className="text-lg font-semibold">{totals.funded}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
              <p className="text-xs text-slate-400">In flight</p>
              <p className="text-lg font-semibold">{totals.inFlight}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
              <p className="text-xs text-slate-400">Transactions</p>
              <p className="text-lg font-semibold">{transactions.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Active milestones" value={activeMilestones.length} />
        <StatCard label="Transactions" value={transactions.length} />
      </div>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pipeline</h3>
            <Link to="/projects" className="text-sm text-primary hover:text-primary/80">
              View all
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {spotlightProjects.map((p) => (
              <div
                key={p._id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-primary transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">{p.status || "Unknown"}</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100">
                    {p.contractProjectId ? `On-chain #${p.contractProjectId}` : "Off-chain"}
                  </span>
                </div>
                <p className="text-lg font-semibold mb-1">{p.title}</p>
                <p className="text-slate-400 text-sm">{p.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Budget: {formatEth(p.budget)}</span>
                  <span className="text-slate-400">Remaining: {formatEth(p.remainingBalance)}</span>
                </div>
              </div>
            ))}
            {!spotlightProjects.length && (
              <p className="text-slate-400">No projects yet. Create one to light up this view.</p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Active milestones</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {activeMilestones.map((m) => (
                <MilestoneCard key={m._id} milestone={m} />
              ))}
              {!activeMilestones.length && <p className="text-slate-400">No milestones yet.</p>}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Transaction pulse</h3>
              <span className="text-xs text-slate-400">Last {recentTransactions.length || 0}</span>
            </div>
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div key={tx._id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{tx.action}</span>
                    <span className="uppercase tracking-wide text-primary">{tx.status}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-100">{formatEth(tx.amount)}</span>
                    <span className="text-slate-400">{tx.network || "sepolia"}</span>
                  </div>
                  <div className="mt-1 text-xs text-primary">
                    {tx.txHash ? `${tx.txHash.slice(0, 10)}...` : "pending"}
                  </div>
                </div>
              ))}
              {!recentTransactions.length && (
                <p className="text-slate-400">No on-chain activity yet. Kick off a fund or payout.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-100">Demo tips</h4>
            <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
              <li>Fund a project then submit and approve a milestone to trigger payout.</li>
              <li>Keep MetaMask on Sepolia and sync the wallet shown on your profile.</li>
              <li>Use the Transactions tab to confirm on-chain hashes quickly.</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Dashboard;
