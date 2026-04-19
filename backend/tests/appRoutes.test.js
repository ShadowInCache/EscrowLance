import { jest, describe, it, expect } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

jest.mock("../src/middleware/authMiddleware.js", () => ({
  protect: (req, _res, next) => {
    req.user = req.user || { _id: "u1", role: "client" };
    next();
  },
  requireRole:
    () =>
    (_req, _res, next) =>
      next(),
}));

jest.mock("../src/controllers/authController.js", () => ({
  register: (_req, res) => res.status(201).json({ ok: true }),
  login: (_req, res) => res.json({ ok: true }),
  profile: (_req, res) => res.json({ ok: true }),
}));

jest.mock("../src/controllers/projectController.js", () => ({
  createProject: (_req, res) => res.status(201).json({ ok: true }),
  listProjects: (_req, res) => res.json([{ _id: "p1" }]),
  getProject: (_req, res) => res.json({ _id: "p1" }),
  updateStatus: (_req, res) => res.json({ ok: true }),
  fundProject: (_req, res) => res.json({ ok: true }),
  assignFreelancer: (_req, res) => res.json({ ok: true }),
  syncFreelancerAssignment: (_req, res) => res.json({ ok: true }),
  deployProject: (_req, res) => res.json({ ok: true }),
  cancelProject: (_req, res) => res.json({ ok: true }),
  refundClient: (_req, res) => res.json({ ok: true }),
  deleteProject: (_req, res) => res.json({ ok: true }),
}));

jest.mock("../src/controllers/milestoneController.js", () => ({
  createMilestone: (_req, res) => res.status(201).json({ ok: true }),
  submitMilestone: (_req, res) => res.json({ ok: true }),
  approveMilestone: (_req, res) => res.json({ ok: true }),
  releasePayment: (_req, res) => res.json({ ok: true }),
  listByProject: (_req, res) => res.json([]),
}));

jest.mock("../src/controllers/disputeController.js", () => ({
  createDispute: (_req, res) => res.status(201).json({ ok: true }),
  resolveDispute: (_req, res) => res.json({ ok: true }),
  listDisputes: (_req, res) => res.json([]),
  addComment: (_req, res) => res.json({ ok: true }),
  addEvidence: (_req, res) => res.json({ ok: true }),
}));

jest.mock("../src/controllers/transactionController.js", () => ({
  listTransactions: (_req, res) => res.json([]),
  saveTransaction: (_req, res) => res.status(201).json({ ok: true }),
}));

jest.mock("../src/controllers/uploadController.js", () => ({
  uploadFile: (_req, res) => res.json({ ipfsHash: "QmX" }),
  uploadMetadata: (_req, res) => res.json({ ipfsHash: "QmY" }),
}));

jest.mock("../src/controllers/userController.js", () => ({
  listFreelancers: (_req, res) => res.json([]),
}));

jest.mock("../src/blockchain/contractClient.js", () => ({
  getContract: jest.fn(() => ({
    target: "0xcontract",
    runner: {
      provider: {
        getNetwork: jest.fn(async () => ({ chainId: 11155111n, name: "sepolia" })),
        getCode: jest.fn(async () => "0x1234"),
      },
    },
    projectCount: jest.fn(async () => 3n),
  })),
}));

describe("app routes", () => {
  it("health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("health blockchain returns status", async () => {
    const res = await request(app).get("/health/blockchain");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("auth routes mounted", async () => {
    expect((await request(app).post("/api/auth/register")).status).toBe(201);
    expect((await request(app).post("/api/auth/login")).status).toBe(200);
    expect((await request(app).get("/api/auth/profile")).status).toBe(200);
  });

  it("project routes mounted", async () => {
    expect((await request(app).post("/api/projects/create")).status).toBe(201);
    expect((await request(app).get("/api/projects")).status).toBe(200);
    expect((await request(app).get("/api/projects/1")).status).toBe(200);
    expect((await request(app).post("/api/projects/1/deploy")).status).toBe(200);
    expect((await request(app).post("/api/projects/1/fund")).status).toBe(200);
    expect((await request(app).post("/api/projects/1/assign")).status).toBe(200);
    expect((await request(app).post("/api/projects/1/sync-assignment")).status).toBe(200);
    expect((await request(app).post("/api/projects/1/cancel")).status).toBe(200);
    expect((await request(app).post("/api/projects/1/refund")).status).toBe(200);
    expect((await request(app).delete("/api/projects/1")).status).toBe(200);
  });

  it("milestone/dispute/upload/transactions/users routes mounted", async () => {
    expect((await request(app).post("/api/milestones/create")).status).toBe(201);
    expect((await request(app).post("/api/milestones/submit")).status).toBe(200);
    expect((await request(app).post("/api/milestones/approve")).status).toBe(200);
    expect((await request(app).post("/api/milestones/release")).status).toBe(200);
    expect((await request(app).get("/api/milestones/project/1")).status).toBe(200);

    expect((await request(app).post("/api/disputes/create")).status).toBe(201);
    expect((await request(app).post("/api/disputes/resolve")).status).toBe(200);
    expect((await request(app).get("/api/disputes")).status).toBe(200);
    expect((await request(app).post("/api/disputes/1/comment")).status).toBe(200);
    expect((await request(app).post("/api/disputes/1/evidence")).status).toBe(200);

    expect((await request(app).get("/api/transactions")).status).toBe(200);
    expect((await request(app).post("/api/transactions/save")).status).toBe(201);

    expect((await request(app).post("/api/upload")).status).toBe(200);
    expect((await request(app).post("/api/upload/json")).status).toBe(200);

    expect((await request(app).get("/api/users/freelancers")).status).toBe(200);
  });

  it("notFound middleware for unknown route", async () => {
    const res = await request(app).get("/api/not-found-anything");
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Not Found");
  });
});
