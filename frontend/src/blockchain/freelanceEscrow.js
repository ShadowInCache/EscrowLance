import { ethers } from "ethers";
import { CHAINESCROW_CONTRACT_ADDRESS } from "../config/env.js";
import ABI from "./abi/FreelanceEscrow.json";

export const getFreelanceEscrowAddress = () => {
  const address = CHAINESCROW_CONTRACT_ADDRESS;
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