import React from "react";
import { Link } from "react-router-dom";

const steps = [
  {
    title: "Connect and verify",
    description: "Use MetaMask to connect and confirm you are on Sepolia before funding.",
  },
  {
    title: "Create your project",
    description: "Define milestones, budgets, and who will deliver. Everything is tracked on-chain.",
  },
  {
    title: "Fund escrow with confidence",
    description: "Deposit once; funds stay locked until you approve the work.",
  },
  {
    title: "Approve milestones, auto-release",
    description: "When a milestone is approved, the contract releases payment automatically.",
  },
];

const stats = [
  { label: "Escrow safeguard", value: "Multi-milestone" },
  { label: "Network", value: "Sepolia" },
  { label: "Payout trigger", value: "Client approval" },
];

const Landing = () => (
  <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
    <div className="absolute inset-0 opacity-70" aria-hidden>
      <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-primary blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-cyan-500 blur-3xl" />
    </div>

    <div className="relative max-w-6xl mx-auto px-6 py-16 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            On-chain escrow
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Build trust with milestone-based smart contracts
            </h1>
            <p className="text-slate-300 text-lg">
              EscrowLancer lets clients fund work securely, freelancers submit verifiable proofs, and payments release automatically when milestones are approved.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:shadow-primary/40"
              to="/signup"
            >
              Get started
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 font-semibold text-white/90 transition hover:-translate-y-0.5 hover:border-white/30"
              to="/login"
            >
              Login
            </Link>
            <span className="text-sm text-slate-400">No gas leaves escrow until you approve a milestone.</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/5 bg-white/5 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm p-6 shadow-2xl shadow-primary/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">How it works</p>
                <h3 className="text-xl font-semibold">From kickoff to payout</h3>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Secure by design</span>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div
                  key={step.title}
                  className="flex gap-3 rounded-lg border border-white/5 bg-slate-900/60 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{step.title}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              Funds move only when milestones are approved by the client.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Landing;
