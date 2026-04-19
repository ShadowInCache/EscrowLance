import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  createMilestone,
  submitMilestone,
  approveMilestone,
  releasePayment,
  listByProject,
} from "../src/controllers/milestoneController.js";
import Milestone from "../src/models/Milestone.js";
import Project from "../src/models/Project.js";
import Transaction from "../src/models/Transaction.js";
import { createSaveable } from "./helpers/mockModel.js";

jest.mock("../src/models/Milestone.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock("../src/models/Project.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../src/models/Transaction.js", () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock("../src/blockchain/contractClient.js", () => ({
  getContract: jest.fn(() => ({
    target: "0xcontract",
    runner: {
      provider: {
        getTransactionReceipt: jest.fn(async () => ({
          status: 1,
          from: "0xabc",
          to: "0xcontract",
          hash: "0xsub",
          logs: [{}],
        })),
      },
    },
    interface: {
      parseLog: jest.fn(() => ({ name: "MilestoneSubmitted", args: { projectId: 1, milestoneId: 0, workHash: "w1" } })),
    },
  })),
}));

jest.mock("../src/services/blockchainService.js", () => ({
  approveMilestoneOnChain: jest.fn(async () => ({ wait: async () => ({ hash: "0xapprove" }) })),
  releasePaymentOnChain: jest.fn(async () => ({ wait: async () => ({ hash: "0xpay" }) })),
}));

const resFactory = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("milestoneController", () => {
  beforeEach(() => jest.clearAllMocks());

  it("createMilestone validates payload", async () => {
    const req = { body: {}, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    await createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createMilestone blocks non-owner", async () => {
    const req = {
      body: { projectId: "p1", title: "M1", amount: 1 },
      user: { _id: "u2", role: "client" },
    };
    const res = resFactory();

    Project.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ clientId: "u1", milestones: [] }) });

    await createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("submitMilestone validates required fields", async () => {
    const req = { body: {}, user: { _id: "u2", role: "freelancer" } };
    const res = resFactory();

    await submitMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("submitMilestone succeeds", async () => {
    const req = {
      body: { projectId: "p1", milestoneId: "m1", workHash: "w1", submitTxHash: "0xsub" },
      user: { _id: "u2", role: "freelancer", walletAddress: "0xabc" },
    };
    const res = resFactory();

    const milestoneDoc = createSaveable({
      _id: "m1",
      projectId: "p1",
      status: "Pending",
      contractMilestoneId: 0,
      amount: 1,
    });
    const projectDoc = createSaveable({
      _id: "p1",
      freelancerId: "u2",
      clientId: "u1",
      contractProjectId: 1,
      status: "Funded",
    });

    Milestone.findById.mockResolvedValue(milestoneDoc);
    Project.findById.mockResolvedValue(projectDoc);

    await submitMilestone(req, res);

    expect(Transaction.create).toHaveBeenCalledWith(expect.objectContaining({ action: "submitMilestone" }));
    expect(res.json).toHaveBeenCalled();
  });

  it("approveMilestone rejects non-submitted", async () => {
    const req = { body: { projectId: "p1", milestoneId: "m1" }, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    Milestone.findById.mockResolvedValue({ status: "Pending" });

    await approveMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("releasePayment requires approved", async () => {
    const req = { body: { projectId: "p1", milestoneId: "m1" }, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    Milestone.findById.mockResolvedValue({ projectId: "p1", status: "Submitted" });
    Project.findById.mockResolvedValue({ _id: "p1", clientId: "u1", contractProjectId: 1 });

    await releasePayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("listByProject rejects non participant", async () => {
    const req = { params: { projectId: "p1" }, user: { _id: "u9", role: "client" } };
    const res = resFactory();

    Project.findById.mockResolvedValue({ _id: "p1", clientId: "u1", freelancerId: "u2" });

    await listByProject(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
