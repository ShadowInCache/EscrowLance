const firstNonEmpty = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const setAlias = (primaryKey, aliases = []) => {
  const resolved = firstNonEmpty(primaryKey, ...aliases);
  if (resolved) {
    process.env[primaryKey] = resolved;
  }
  return resolved;
};

export const normalizeRuntimeEnv = () => {
  setAlias("MONGO_URI", ["MONGODB_URI", "DATABASE_URL"]);
  setAlias("JWT_SECRET", ["JWT_KEY", "AUTH_JWT_SECRET"]);
  setAlias("CLIENT_URL", ["FRONTEND_URL"]);
  setAlias("SEPOLIA_RPC_URL", ["RPC_URL", "ETH_RPC_URL", "ALCHEMY_SEPOLIA_RPC_URL", "INFURA_SEPOLIA_RPC_URL"]);
  setAlias("CHAINESCROW_CONTRACT_ADDRESS", ["CONTRACT_ADDRESS", "ESCROW_CONTRACT_ADDRESS", "FREELANCE_ESCROW_CONTRACT_ADDRESS"]);
  return {
    MONGO_URI: firstNonEmpty("MONGO_URI"),
    JWT_SECRET: firstNonEmpty("JWT_SECRET"),
    SEPOLIA_RPC_URL: firstNonEmpty("SEPOLIA_RPC_URL"),
    PRIVATE_KEY: firstNonEmpty("PRIVATE_KEY"),
    CHAINESCROW_CONTRACT_ADDRESS: firstNonEmpty("CHAINESCROW_CONTRACT_ADDRESS"),
  };
};

export const getMissingEnvKeys = (requiredKeys = []) =>
  requiredKeys.filter((key) => !firstNonEmpty(key));
