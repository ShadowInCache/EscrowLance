import React from "react";
import { useWallet } from "../hooks/useWallet.js";
import { useAuth } from "../context/AuthContext.jsx";

const Topbar = () => {
  const { address, connect, network, isConnected } = useWallet();
  const { user } = useAuth();

  const chainName = network?.name || "";
  const chainId = network?.chainId ? Number(network.chainId) : null;
  const isSepolia = chainId === 11155111;
  const walletLabel = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect wallet";
  const ready = isConnected && isSepolia;
  const networkLabel = chainName ? `${chainName}${isSepolia ? " • ready" : " • switch"}` : "Network";

  return (
    <header className="glass-panel flex items-center justify-between px-6 py-4 border border-white/10 text-slate-100 bg-gradient-to-r from-slate-950/70 via-slate-900/60 to-slate-950/70">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300/80">Welcome back</p>
        <p className="font-semibold text-lg leading-tight">{user?.name || "Guest"}</p>
        <p className="text-xs text-slate-300/80">Keep your wallet on Sepolia to stay ready for on-chain actions.</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span
          className={`px-3 py-1 rounded-full border text-[11px] font-semibold tracking-wide flex items-center gap-1 ${
            isSepolia
              ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-100"
              : "bg-amber-500/10 border-amber-400/40 text-amber-100"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current opacity-80" />
          {networkLabel}
        </span>

        <span
          className={`px-3 py-1 rounded-full border text-[11px] font-semibold tracking-wide flex items-center gap-1 ${
            isConnected ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-100" : "bg-white/5 border-white/20 text-slate-100"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current opacity-70" />
          {walletLabel}
        </span>

        <button
          onClick={!isConnected ? connect : undefined}
          disabled={isConnected}
          className={`relative overflow-hidden px-4 py-2 rounded-lg font-semibold transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-default ${
            ready
              ? "bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300 text-slate-950 shadow-[0_18px_40px_-14px_rgba(16,185,129,0.9)] hover:shadow-emerald-300/60"
              : "bg-primary text-slate-950 shadow-[0_14px_34px_-14px_rgba(6,182,212,0.8)] hover:shadow-primary/40"
          } ${isConnected ? "" : "animate-pulse"}`}
        >
          {isConnected ? "Connected" : "Connect"}
        </button>
      </div>
    </header>
  );
};

export default Topbar;
