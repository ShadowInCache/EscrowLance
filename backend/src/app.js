import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import milestoneRoutes from "./routes/milestoneRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { getContract } from "./blockchain/contractClient.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.get("/health/blockchain", async (_req, res) => {
  try {
    const contract = getContract();
    const provider = contract.runner.provider;

    const [network, code] = await Promise.all([provider.getNetwork(), provider.getCode(contract.target)]);
    const hasCode = code && code !== "0x";
    let projectCount = null;
    let projectCountError = null;

    if (hasCode) {
      try {
        projectCount = (await contract.projectCount()).toString();
      } catch (err) {
        projectCountError = err.message;
      }
    }

    res.json({
      status: "ok",
      address: contract.target,
      hasCode,
      codeSizeBytes: code ? (code.length - 2) / 2 : 0,
      network: { chainId: network.chainId?.toString(), name: network.name },
      projectCount,
      projectCountError,
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message, timestamp: Date.now() });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
