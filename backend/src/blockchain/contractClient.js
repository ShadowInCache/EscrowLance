import { readFileSync } from "fs";
import { ethers } from "ethers";
import { normalizeRuntimeEnv } from "../config/env.js";

const artifact = JSON.parse(
  readFileSync(new URL("./abi/FreelanceEscrow.json", import.meta.url), "utf-8")
);
const abi = artifact.abi ?? artifact;

export const getContract = () => {
  const normalizedEnv = normalizeRuntimeEnv();
  const rpc = normalizedEnv.SEPOLIA_RPC_URL;
  const privateKey = normalizedEnv.PRIVATE_KEY;
  const contractAddress = normalizedEnv.CHAINESCROW_CONTRACT_ADDRESS;
  const missing = [];

  if (!rpc) missing.push("SEPOLIA_RPC_URL");
  if (!privateKey) missing.push("PRIVATE_KEY");
  if (!contractAddress) missing.push("CHAINESCROW_CONTRACT_ADDRESS");

  if (missing.length) {
    throw new Error(`Missing blockchain environment variables: ${missing.join(", ")}`);
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, abi, wallet);
};
