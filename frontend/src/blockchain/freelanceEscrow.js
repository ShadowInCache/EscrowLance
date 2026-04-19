import { ethers } from "ethers";

const ABI = [
  "function submitMilestone(uint256 projectId, uint256 milestoneId, string workHash, uint256 amountWei, string title, uint256 deadline)",
  "function projects(uint256 projectId) view returns (uint256 id, address client, address freelancer, uint256 totalBudget, uint256 remainingBalance, uint8 status, bool funded)",
];

export const getFreelanceEscrowAddress = () => {
  const address = import.meta.env.VITE_CHAINESCROW_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("Missing VITE_CHAINESCROW_CONTRACT_ADDRESS");
  }
  return address;
};

export const getFreelanceEscrowContract = async (provider) => {
  if (!provider) {
    throw new Error("Wallet provider not available");
  }

  const signer = await provider.getSigner();
  return new ethers.Contract(getFreelanceEscrowAddress(), ABI, signer);
};

export const getOnChainProject = async (provider, projectId) => {
  const contract = await getFreelanceEscrowContract(provider);
  return contract.projects(projectId);
};