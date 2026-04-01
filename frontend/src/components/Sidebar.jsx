import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const baseLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/disputes", label: "Disputes" },
  { to: "/wallet", label: "Wallet" },
  { to: "/profile", label: "Profile" },
];

const clientExtras = [
  { to: "/projects/new", label: "Create Project" },
  { to: "/transactions", label: "Transactions" },
];

const freelancerExtras = [
  { to: "/milestones/submit", label: "Submit Milestone" },
];

const adminExtras = [
  { to: "/projects/new", label: "Create Project" },
  { to: "/transactions", label: "Transactions" },
  { to: "/milestones/submit", label: "Submit Milestone" },
];

const linksForRole = (role) => {
  if (role === "client") return [...baseLinks, ...clientExtras];
  if (role === "freelancer") return [...baseLinks, ...freelancerExtras];
  if (role === "admin") return [...baseLinks, ...adminExtras];
  return baseLinks; // fallback
};

const Sidebar = () => {
  const { logout, user } = useAuth();
  const links = linksForRole(user?.role);
  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.email ||
    "Guest";
  return (
    <aside className="w-64 glass-panel p-5 hidden md:flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-60 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.14),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.12),transparent_26%)]" />
      <div className="relative z-10">
        <div className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-200 via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
          EscrowLancer
        </div>
        <p className="text-xs text-slate-400">On-chain trust for projects</p>
      </div>
      <nav className="relative z-10 space-y-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_10px_30px_-12px_rgba(6,182,212,0.7)]"
                  : "hover:bg-white/5 hover:translate-x-1"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="relative z-10 mt-auto">
        <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
            Session
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/50 to-emerald-500/40 border border-white/10 flex items-center justify-center text-sm font-semibold text-white">
              {displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white leading-tight">
                {displayName}
              </div>
              <div className="text-xs text-slate-400">Securely signed in</div>
            </div>
            <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              Active
            </span>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 text-sm font-semibold text-white hover:from-slate-700 hover:to-slate-800 hover:-translate-y-[1px] transition-all"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">↦</span>
            Log out
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Done for now? Log out to keep your workspace secure.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
