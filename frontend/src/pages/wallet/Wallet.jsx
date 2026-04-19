import React, { useState } from "react";
import { useWallet } from "../../hooks/useWallet.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { SUPPORTED_CHAIN_HEX, SUPPORTED_CHAIN_ID, SUPPORTED_CHAIN_NAME } from "../../config/env.js";

const Wallet = () => {
  const { user } = useAuth();
  const {
    address,
    connect,
    disconnect,
    network,
    isConnected,
    provider,
    switchToChain,
    isSwitching,
    error: walletError,
  } = useWallet();

  const [status, setStatus] = useState("");
  const walletMatchesUser = Boolean(
    address && user?.walletAddress && address.toLowerCase() === user.walletAddress.toLowerCase()
  );
  const showConnected = isConnected && walletMatchesUser;
  const onWrongNetwork = network && Number(network.chainId) !== SUPPORTED_CHAIN_ID;

  const short = (val) => (val ? `${val.slice(0, 6)}...${val.slice(-4)}` : "-");
  const networkName = network?.name || "-";
  const networkId = network?.chainId ? Number(network.chainId) : "-";

  const handleSwitch = async () => {
    setStatus("");
    try {
      if (!provider) {
        setStatus("MetaMask not available in this browser.");
        return;
      }
      await provider.send("wallet_requestPermissions", [{ eth_accounts: {} }]);
      await connect();
    } catch (err) {
      console.error(err);
      setStatus("Please open MetaMask and pick the correct account.");
    }
  };

  const primaryAction = () => {
    if (onWrongNetwork) return switchToChain(SUPPORTED_CHAIN_HEX);
    if (!isConnected) return handleSwitch();
    if (!walletMatchesUser) return handleSwitch();
    return undefined;
  };

  const primaryLabel = () => {
    if (showConnected) return "Connected";
    if (onWrongNetwork) return isSwitching ? "Switching..." : `Switch to ${SUPPORTED_CHAIN_NAME}`;
    if (!isConnected) return "Connect MetaMask";
    if (!walletMatchesUser) return "Switch to profile wallet";
    return "Connect";
  };

  const statusPill = (ok, labelOk, labelBad) => (
    <span
      className={`px-2.5 py-1 text-xs rounded-full border ${
        ok
          ? "border-emerald-400 text-emerald-200 bg-emerald-400/10"
          : "border-amber-400 text-amber-200 bg-amber-400/10"
      }`}
    >
      {ok ? labelOk : labelBad}
    </span>
  );

  const connectionState = () => {
    if (showConnected) {
      return {
        title: "Connected and aligned",
        description: "On Sepolia and wallet matches your profile. You are ready to sign and fund.",
        tone: "ok",
      };
    }
    if (onWrongNetwork) {
      return {
        title: "Wrong network",
        description: "Switch MetaMask to Sepolia so transactions go to the testnet.",
        tone: "warn",
      };
    }
    if (!isConnected) {
      return {
        title: "Not connected",
        description: "Connect MetaMask to select an account and proceed.",
        tone: "warn",
      };
    }
    return {
      title: "Account mismatch",
      description: "Pick the MetaMask account that matches your profile wallet.",
      tone: "warn",
    };
  };

  const { title: stateTitle, description: stateDescription, tone: stateTone } = connectionState();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-slate-400">Wallet Center</p>
            <h2 className="text-2xl font-semibold text-white">Connect, align, and stay on-chain</h2>
            <p className="text-sm text-slate-300">
              Ensure MetaMask is connected, on Sepolia, and matches your profile wallet before starting a demo.
            </p>
            {status && <p className="text-xs text-amber-300">{status}</p>}
            {walletError && <p className="text-xs text-amber-300">{walletError}</p>}
          </div>

          <div
            className={`w-full md:w-80 rounded-xl border p-4 shadow-sm ${
              stateTone === "ok"
                ? "border-emerald-500/60 bg-emerald-500/5 shadow-emerald-500/10"
                : "border-amber-400/50 bg-amber-400/5 shadow-amber-400/10"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Connection status</p>
                <p className="text-lg font-semibold text-white">{stateTitle}</p>
              </div>
              {statusPill(showConnected, "Ready", "Action needed")}
            </div>
            <p className="mt-2 text-sm text-slate-200">{stateDescription}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  showConnected
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-primary text-slate-950 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0"
                }`}
                onClick={showConnected ? undefined : primaryAction}
                disabled={showConnected || isSwitching}
              >
                {primaryLabel()}
              </button>
              {isConnected && (
                <button
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700 text-slate-200 hover:border-slate-500"
                  onClick={disconnect}
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400">Connection</p>
              <p className="text-lg font-semibold text-white">{isConnected ? short(address) : "Not connected"}</p>
            </div>
            {statusPill(isConnected, "Connected", "Action needed")}
          </div>
          <p className="mt-2 text-sm text-slate-400">Use MetaMask and pick the account you want to transact with.</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400">Account match</p>
              <p className="text-lg font-semibold text-white">
                {walletMatchesUser ? "Matches profile" : "Mismatch"}
              </p>
            </div>
            {statusPill(walletMatchesUser, "Synced", "Mismatch")}
          </div>
          <p className="mt-2 text-sm text-slate-400">Profile wallet: {short(user?.walletAddress)}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400">Network</p>
              <p className="text-lg font-semibold text-white">{networkName}</p>
            </div>
            {statusPill(!onWrongNetwork, "Sepolia", "Switch required")}
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
            <span>Chain ID</span>
            <span className="font-mono text-slate-200">{networkId}</span>
          </div>
          {onWrongNetwork && (
            <button
              className="mt-3 text-xs text-primary underline underline-offset-4 disabled:opacity-60"
              onClick={() => switchToChain(SUPPORTED_CHAIN_HEX)}
              disabled={isSwitching}
            >
              {isSwitching ? "Switching..." : `Switch to ${SUPPORTED_CHAIN_NAME}`}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400">Live details</p>
              <p className="text-lg font-semibold text-white">Connection state</p>
            </div>
            {statusPill(showConnected, "Ready", "Incomplete")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-400">Connected address</p>
              <p className="mt-1 font-mono text-sm text-white break-all">{address || "Not connected"}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-400">Profile wallet</p>
              <p className="mt-1 font-mono text-sm text-white break-all">{user?.walletAddress || "Not set"}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-400">Network</p>
              <p className="mt-1 text-sm text-white">{networkName}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-400">Status</p>
              <p className="mt-1 text-sm text-white">{showConnected ? "Aligned" : "Needs setup"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <p className="text-xs uppercase text-slate-400">Checklist</p>
          <ul className="space-y-2 text-sm text-slate-200 list-disc list-inside">
            <li>MetaMask installed and unlocked.</li>
            <li>Network set to Sepolia.</li>
            <li>Connected account matches your profile wallet.</li>
            <li>If things look stuck, disconnect then reconnect.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
