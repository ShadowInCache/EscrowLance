const mode = import.meta.env.MODE || "development";
const isProd = mode === "production";

const requireInProd = (name, value) => {
  if (isProd && (!value || String(value).trim() === "")) {
    throw new Error(`${name} is required in production`);
  }
  return value;
};

export const APP_MODE = mode;
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (isProd ? requireInProd("VITE_API_BASE_URL", "") : "http://localhost:5000/api");
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000);

export const SUPPORTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
export const SUPPORTED_CHAIN_HEX =
  import.meta.env.VITE_CHAIN_HEX || `0x${SUPPORTED_CHAIN_ID.toString(16)}`;
export const SUPPORTED_CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Sepolia";

export const CHAINESCROW_CONTRACT_ADDRESS = requireInProd(
  "VITE_CHAINESCROW_CONTRACT_ADDRESS",
  import.meta.env.VITE_CHAINESCROW_CONTRACT_ADDRESS
);

export const EXPLORER_BASE_URL =
  import.meta.env.VITE_ETHERSCAN_BASE || "https://sepolia.etherscan.io";

export const RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
