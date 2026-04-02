import React from "react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Escrow safeguard", value: "Multi-milestone" },
  { label: "Network", value: "Sepolia" },
  { label: "Payout trigger", value: "Client approval" },
];

const Landing = () => (
  <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
    {/* Animated gradient background */}
    <div className="absolute inset-0 opacity-40" aria-hidden>
      <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-cyan-500/30 blur-3xl animate-pulse" />
      <div className="absolute right-1/4 bottom-20 h-96 w-96 rounded-full bg-rose-500/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute left-1/2 top-1/2 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>

    {/* Main content - centered */}
    <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col items-center justify-center min-h-screen text-center">
      
      {/* Badge */}
      <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary mb-8 backdrop-blur-sm animate-fade-in-up">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        On-chain escrow powered by smart contracts
      </div>

      {/* Heading */}
      <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        Build trust with
        <span className="block bg-gradient-to-r from-cyan-400 via-primary to-rose-400 bg-clip-text text-transparent">
          milestone-based escrow
        </span>
      </h1>

      {/* Subheading */}
      <p className="text-slate-400 text-lg md:text-xl mb-8 max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        Secure payments, verifiable proofs, and automatic releases when milestones are approved. Trust without intermediaries.
      </p>

      {/* Main Image - Floating with antigravity effect */}
      <div className="relative mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-primary/20 to-rose-500/20 rounded-3xl blur-3xl animate-pulse" />
        <div className="relative floating">
          <img 
            src="/Main.png" 
            alt="EscrowLance Platform" 
            className="w-full max-w-4xl rounded-2xl shadow-2xl shadow-primary/30 border border-white/10"
          />
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-primary px-8 py-4 font-semibold text-white shadow-lg shadow-primary/40 transition hover:scale-105 hover:shadow-primary/60"
          to="/signup"
        >
          Get started
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm px-8 py-4 font-semibold text-white transition hover:scale-105 hover:bg-white/10"
          to="/login"
        >
          Login
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        {stats.map((item, idx) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-4 hover:bg-white/10 transition floating"
            style={{ animationDelay: `${idx * 0.2}s` }}
          >
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
            <p className="text-xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Landing;
