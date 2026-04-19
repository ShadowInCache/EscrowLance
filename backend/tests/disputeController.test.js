import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  listDisputes,
  createDispute,
  resolveDispute,
  addComment,
  addEvidence,
} from "../src/controllers/disputeController.js";
import Dispute from "../src/models/Dispute.js";
import Project from "../src/models/Project.js";
import Milestone from "../src/models/Milestone.js";
import Transaction from "../src/models/Transaction.js";
import { createQueryResult, createSaveable } from "./helpers/mockModel.js";

jest.mock("../src/models/Dispute.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../src/models/Project.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("../src/models/Milestone.js", () => ({
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

jest.mock("../src/services/blockchainService.js", () => ({
  raiseDisputeOnChain: jest.fn(async () => ({ wait: async () => ({ hash: "0xraise" }), hash: "0xraise" })),
  resolveDisputeOnChain: jest.fn(async () => ({ wait: async () => ({ hash: "0xresolve" }) })),
}));

const resFactory = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("disputeController", () => {
  beforeEach(() => jest.clearAllMocks());

  it("listDisputes returns [] when user has no projects", async () => {
    const req = { user: { _id: "u1", role: "client" } };
    const res = resFactory();

    Project.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    await listDisputes(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("createDispute validates reason", async () => {
    const req = { body: { projectId: "p1", reason: "" }, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    await createDispute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createDispute rejects if project missing", async () => {
    const req = { body: { projectId: "p1", reason: "Issue" }, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    Project.findById.mockResolvedValue(null);

    await createDispute(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("resolveDispute validates payload", async () => {
    const req = { body: {}, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    await resolveDispute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("addComment rejects empty text", async () => {
    const req = { params: { id: "d1" }, body: { text: "" }, user: { _id: "u1" } };
    const res = resFactory();

    await addComment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("addEvidence rejects missing hash", async () => {
    const req = { params: { id: "d1" }, body: {}, user: { _id: "u1" } };
    const res = resFactory();

    await addEvidence(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("addComment allows participant", async () => {
    const req = { params: { id: "d1" }, body: { text: "hello" }, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    const disputeDoc = createSaveable({
      _id: "d1",
      projectId: { clientId: "u1", freelancerId: "u2" },
      comments: { id: jest.fn(() => null), push: jest.fn() },
    });

    Dispute.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(disputeDoc),
    });

    Dispute.findById.mockReturnValueOnce({
      populate: jest.fn().mockResolvedValue(disputeDoc),
    }).mockReturnValueOnce(createQueryResult(disputeDoc));

    await addComment(req, res);

    expect(res.json).toHaveBeenCalled();
  });
});
