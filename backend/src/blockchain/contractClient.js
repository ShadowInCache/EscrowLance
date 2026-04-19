import { readFileSync } from "fs";
import { ethers } from "ethers";

const artifact = JSON.parse(
  readFileSync(new URL("./abi/FreelanceEscrow.json", import.meta.url), "utf-8")
);
const abi = artifact.abi ?? artifact;

export const getContract = () => {
  const rpc = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.CHAINESCROW_CONTRACT_ADDRESS;
  if (!rpc || !privateKey || !contractAddress) {
    throw new Error("Missing blockchain env vars");
  }
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, abi, wallet);
};
