import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;
const requiredEnv = ["MONGO_URI", "JWT_SECRET", "CHAINESCROW_CONTRACT_ADDRESS", "SEPOLIA_RPC_URL"];

const start = async () => {
  try {
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if ((process.env.JWT_SECRET || "").length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters long in production.");
    }

    await connectDB(process.env.MONGO_URI);
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
