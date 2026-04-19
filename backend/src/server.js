import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { getMissingEnvKeys, normalizeRuntimeEnv } from "./config/env.js";

const PORT = process.env.PORT || 5000;
const requiredStartupEnv = ["MONGO_URI", "JWT_SECRET"];
const blockchainEnv = ["SEPOLIA_RPC_URL", "PRIVATE_KEY", "CHAINESCROW_CONTRACT_ADDRESS"];

const start = async () => {
  try {
    const normalizedEnv = normalizeRuntimeEnv();

    const missing = getMissingEnvKeys(requiredStartupEnv);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if ((normalizedEnv.JWT_SECRET || "").length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters long in production.");
    }

    const missingBlockchainEnv = getMissingEnvKeys(blockchainEnv);
    if (missingBlockchainEnv.length) {
      console.warn(
        `Blockchain features may fail until environment variables are set: ${missingBlockchainEnv.join(", ")}`
      );
    }

    await connectDB(normalizedEnv.MONGO_URI);
    const server = app.listen(PORT, () => {
      console.log(`API running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down server...`);
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("Failed to start server", err.message);
    process.exit(1);
  }
};

start();
