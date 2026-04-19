import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import {
  submitMilestone,
  fetchProjects,
  listMilestones,
  uploadProofFile,
  syncProjectFreelancerAssignment,
} from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useWallet } from "../../hooks/useWallet.js";
import { getFreelanceEscrowContract, getOnChainProject } from "../../blockchain/freelanceEscrow.js";
import { SUPPORTED_CHAIN_HEX, SUPPORTED_CHAIN_ID, SUPPORTED_CHAIN_NAME } from "../../config/env.js";

const SubmitMilestone = () => {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const ONCHAIN_PROJECT_STATUS = {
    CREATED: 0,
    FUNDED: 1,
    IN_PROGRESS: 2,
    SUBMITTED: 3,
    COMPLETED: 4,
    CANCELLED: 5,
    DISPUTED: 6,
  };
  const [form, setForm] = useState({ projectId: "", milestoneId: "", workHash: "", ipfsHash: "" });
  const [message, setMessage] = useState(null);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [txStatus, setTxStatus] = useState("");
  const [file, setFile] = useState(null);
  const { user } = useAuth();
  const { addToast } = useToast();
  const { provider, address, connect, switchToChain, isConnected } = useWallet();

  const getFreshProvider = () => {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  };

  const waitForExpectedChain = async (expectedChainId, attempts = 12, delayMs = 150) => {
    if (!window.ethereum) return false;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const currentChainHex = await window.ethereum.request({ method: "eth_chainId" });
        const currentChainId = Number.parseInt(currentChainHex, 16);
        if (currentChainId === expectedChainId) return true;
      } catch (err) {
        console.error("Failed reading chain id", err);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return false;
  };

  const describeOnChainStatus = (statusValue) => {
    switch (statusValue) {
      case ONCHAIN_PROJECT_STATUS.CREATED:
        return "Created";
      case ONCHAIN_PROJECT_STATUS.FUNDED:
        return "Funded";
      case ONCHAIN_PROJECT_STATUS.IN_PROGRESS:
        return "InProgress";
      case ONCHAIN_PROJECT_STATUS.SUBMITTED:
        return "Submitted";
      case ONCHAIN_PROJECT_STATUS.COMPLETED:
        return "Completed";
      case ONCHAIN_PROJECT_STATUS.CANCELLED:
        return "Cancelled";
      case ONCHAIN_PROJECT_STATUS.DISPUTED:
        return "Disputed";
      default:
        return "Unknown";
    }
  };

  const getInactiveStatusGuidance = (statusValue) => {
    switch (statusValue) {
      case ONCHAIN_PROJECT_STATUS.CREATED:
        return "Client must fund the escrow first, then assign freelancer on project details.";
      case ONCHAIN_PROJECT_STATUS.SUBMITTED:
        return "A submitted milestone is pending client action. Ask the client to approve and release payment first.";
      case ONCHAIN_PROJECT_STATUS.COMPLETED:
        return "Project is already completed on-chain.";
      case ONCHAIN_PROJECT_STATUS.CANCELLED:
        return "Project was cancelled on-chain.";
      case ONCHAIN_PROJECT_STATUS.DISPUTED:
        return "Project is in dispute. Resolve dispute before submitting milestones.";
      default:
        return "Open project details and ensure escrow is funded and freelancer is assigned.";
    }
  };

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
    setTxStatus("");
    if (!form.projectId || !form.milestoneId) {
      setError("Select a project and milestone first");
      return;
    }
    const target = milestones.find((m) => m._id === form.milestoneId);
    const selectedProject = projects.find((p) => p._id === form.projectId);
    const effectiveWorkHash = (form.workHash || form.ipfsHash || "").trim();

    if (!target) {
      setError("Select a valid milestone first");
      return;
    }
    if (!selectedProject) {
      setError("Select a valid project first");
      return;
    }
    if (target && target.status !== "Pending") {
      setError("Only Pending milestones can be submitted.");
      return;
    }
    if (target.contractMilestoneId === undefined || target.contractMilestoneId === null) {
      setError("This milestone is not linked to an on-chain milestone index yet.");
      return;
    }
    if (selectedProject.contractProjectId === undefined || selectedProject.contractProjectId === null) {
      setError("This project is not deployed on-chain yet.");
      return;
    }
    if (!effectiveWorkHash) {
      setError("Upload proof to IPFS or provide a work hash before submission.");
      return;
    }
    if (!window.ethereum && !provider) {
      setError("MetaMask is not available in this browser.");
      return;
    }

    let activeProvider = provider || getFreshProvider();
    if (!activeProvider) {
      setError("MetaMask is not available in this browser.");
      return;
    }

    let connectedAddress = address;
    if (!isConnected) {
      try {
        connectedAddress = await connect();
        activeProvider = getFreshProvider() || activeProvider;
      } catch (err) {
        setError(err?.message || "Connect MetaMask first.");
        return;
      }
    }

    let currentNetwork;
    try {
      currentNetwork = await activeProvider.getNetwork();
    } catch (networkErr) {
      activeProvider = getFreshProvider() || activeProvider;
      currentNetwork = await activeProvider.getNetwork();
    }

    if (Number(currentNetwork.chainId) !== SUPPORTED_CHAIN_ID) {
      try {
        await switchToChain(SUPPORTED_CHAIN_HEX);

        const switched = await waitForExpectedChain(SUPPORTED_CHAIN_ID);
        if (!switched) {
          throw new Error(`Network switch timed out. Please confirm MetaMask is on ${SUPPORTED_CHAIN_NAME}.`);
        }

        activeProvider = getFreshProvider() || activeProvider;
        currentNetwork = await activeProvider.getNetwork();
      } catch (err) {
        setError(err?.message || "Switch MetaMask to Sepolia first.");
        return;
      }
    }

    if (Number(currentNetwork.chainId) !== SUPPORTED_CHAIN_ID) {
      setError(`MetaMask must be connected to ${SUPPORTED_CHAIN_NAME}.`);
      return;
    }

    const signer = await activeProvider.getSigner();
    const signerAddress = await signer.getAddress();
    const activeAddress = connectedAddress || signerAddress;
    if (activeAddress && user?.walletAddress && activeAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
      setError("MetaMask must match your freelancer profile wallet.");
      return;
    }

    setLoading(true);
    try {
      setTxStatus("Preparing transaction...");
      let onChainProject = await getOnChainProject(activeProvider, selectedProject.contractProjectId);
      let onChainFreelancer = onChainProject?.freelancer?.toLowerCase?.();

      if (!onChainFreelancer || onChainFreelancer === ZERO_ADDRESS) {
        const selectedFreelancerId = selectedProject?.freelancerId?._id || selectedProject?.freelancerId;
        const activeUserId = user?._id || user?.id;
        const canSyncOwnAssignment =
          selectedFreelancerId && activeUserId && String(selectedFreelancerId) === String(activeUserId);

        if (canSyncOwnAssignment) {
          try {
            await syncProjectFreelancerAssignment(selectedProject._id);
            activeProvider = getFreshProvider() || activeProvider;
            onChainProject = await getOnChainProject(activeProvider, selectedProject.contractProjectId);
            onChainFreelancer = onChainProject?.freelancer?.toLowerCase?.();
          } catch (syncErr) {
            const syncMessage =
              syncErr?.response?.data?.message ||
              "Could not sync freelancer assignment on-chain. Ask the client to assign from project details.";
            setError(syncMessage);
            return;
          }
        }
      }

      if (!onChainFreelancer || onChainFreelancer === ZERO_ADDRESS) {
        setError("No freelancer is assigned on-chain for this project yet. Ask the client to assign freelancer on project page.");
        return;
      }

      const onChainStatusValue = Number(onChainProject?.status);
      const allowedSubmissionStatuses = new Set([
        ONCHAIN_PROJECT_STATUS.FUNDED,
        ONCHAIN_PROJECT_STATUS.IN_PROGRESS,
      ]);
      if (!allowedSubmissionStatuses.has(onChainStatusValue)) {
        const statusLabel = describeOnChainStatus(onChainStatusValue);
        const guidance = getInactiveStatusGuidance(onChainStatusValue);
        setError(`On-chain status is ${statusLabel}. ${guidance}`);
        return;
      }

      if (!activeAddress || onChainFreelancer.toLowerCase() !== activeAddress.toLowerCase()) {
        setError(`This project is assigned on-chain to ${onChainFreelancer}, not your connected wallet (${activeAddress || "none"}).`);
        return;
      }

      const contract = await getFreelanceEscrowContract(activeProvider);
      const milestoneAmountWei = ethers.parseEther(String(target?.amount || 0));
      const deadline = target?.deadline ? Math.floor(new Date(target.deadline).getTime() / 1000) : 0;
      setTxStatus("Awaiting MetaMask confirmation...");
      const tx = await contract.submitMilestone(
        selectedProject.contractProjectId,
        target.contractMilestoneId,
        effectiveWorkHash,
        milestoneAmountWei,
        target.title || "",
        deadline
      );
      setTxStatus(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);
      const receipt = await tx.wait();
      setTxStatus("Transaction confirmed. Syncing backend state...");
      const data = await submitMilestone({
        ...form,
        milestoneId: form.milestoneId,
        workHash: effectiveWorkHash,
        submitTxHash: receipt.hash,
      });
      setMessage(`Submitted milestone ${data._id || form.milestoneId}`);
      setTxStatus("Milestone submission completed successfully.");
      addToast("Milestone submitted", "success");
    } catch (err) {
      console.error("Submit error:", err);
      const msg = err?.userMessage || err?.response?.data?.message || err?.message || "Submission failed. Check status or try again.";
      setError(msg);
      setTxStatus("");
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
      setForm((prev) => ({
        ...prev,
        ipfsHash: res.ipfsHash,
        workHash: prev.workHash || res.ipfsHash,
      }));
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
      {txStatus && (
        <div className="rounded-lg border border-sky-500/50 bg-sky-900/20 px-4 py-3 text-sm text-sky-100">
          {txStatus}
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
              value={form.workHash}
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
