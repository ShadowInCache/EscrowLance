import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { ethers } from "ethers";
import {
  createProject,
  listProjects,
  getProject,
  fundProject,
  assignFreelancer,
  deployProject,
  deleteProject,
} from "../src/controllers/projectController.js";
import Project from "../src/models/Project.js";
import Milestone from "../src/models/Milestone.js";
import Transaction from "../src/models/Transaction.js";
import { createQueryResult, createSaveable } from "./helpers/mockModel.js";

jest.mock("../src/models/Project.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("../src/models/Milestone.js", () => ({
  __esModule: true,
  default: {
    insertMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock("../src/models/Transaction.js", () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock("../src/services/blockchainService.js", () => ({
  createProjectOnChain: jest.fn(),
  fundProjectOnChain: jest.fn(async () => ({ wait: async () => ({ hash: "0xfund" }) })),
  assignFreelancerOnChain: jest.fn(async () => ({ wait: async () => ({ hash: "0xassign" }) })),
  cancelProjectOnChain: jest.fn(async () => ({ wait: async () => ({ hash: "0xcancel" }) })),
  refundClientOnChain: jest.fn(async () => ({ wait: async () => ({ hash: "0xrefund" }) })),
}));

jest.mock("../src/blockchain/contractClient.js", () => ({
  getContract: jest.fn(() => ({
    target: "0xcontract",
    runner: {
      provider: {
        getCode: jest.fn(async () => "0x1234"),
      },
    },
    createProject: jest.fn(async () => ({
      hash: "0xcreate",
      wait: async () => ({
        hash: "0xcreate",
        logs: [],
      }),
    })),
    projectCount: jest.fn(async () => 1n),
    interface: {
      parseLog: jest.fn(() => null),
    },
  })),
}));

const resFactory = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("projectController", () => {
  beforeEach(() => jest.clearAllMocks());

  it("createProject validates required fields", async () => {
    const req = { body: { title: "", description: "", budget: 0 }, user: { _id: "u1" } };
    const res = resFactory();

    await createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createProject creates DB records", async () => {
    const req = {
      body: {
        title: "P1",
        description: "D1",
        budget: 1,
        milestones: [{ title: "M1", amount: 1 }],
      },
      user: { _id: "u1" },
    };
    const res = resFactory();

    const projectDoc = createSaveable({
      _id: "p1",
      budget: 1,
      title: "P1",
      description: "D1",
      clientId: "u1",
      milestones: [],
    });

    Project.create.mockResolvedValue(projectDoc);
    Milestone.insertMany.mockResolvedValue([{ _id: "m1" }]);

    await createProject(req, res);

    expect(Project.create).toHaveBeenCalled();
    expect(Milestone.insertMany).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("listProjects uses client filter", async () => {
    const req = { user: { role: "client", _id: "u1" } };
    const res = resFactory();
    const projects = [{ _id: "p1" }];

    Project.find.mockReturnValue(createQueryResult(projects));
    await listProjects(req, res);

    expect(Project.find).toHaveBeenCalledWith({ clientId: "u1" });
    expect(res.json).toHaveBeenCalledWith(projects);
  });

  it("getProject rejects non participant", async () => {
    const req = { params: { id: "p1" }, user: { _id: "u9", role: "client" } };
    const res = resFactory();

    Project.findById.mockReturnValue(
      createQueryResult({ _id: "p1", clientId: "u1", freelancerId: "u2" })
    );

    await getProject(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("fundProject validates amountWei", async () => {
    const req = { params: { id: "p1" }, body: {}, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    Project.findById.mockResolvedValue(
      createSaveable({ _id: "p1", clientId: "u1", contractProjectId: 1, remainingBalance: 0 })
    );

    await fundProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("fundProject succeeds", async () => {
    const req = {
      params: { id: "p1" },
      body: { amountWei: ethers.parseEther("0.5").toString() },
      user: { _id: "u1", role: "client" },
    };
    const res = resFactory();

    Project.findById.mockResolvedValue(
      createSaveable({ _id: "p1", clientId: "u1", contractProjectId: 1, remainingBalance: 0 })
    );

    await fundProject(req, res);

    expect(Transaction.create).toHaveBeenCalledWith(expect.objectContaining({ action: "fundProject" }));
    expect(res.json).toHaveBeenCalled();
  });

  it("assignFreelancer requires wallet", async () => {
    const req = { params: { id: "p1" }, body: {}, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    Project.findById.mockResolvedValue(createSaveable({ _id: "p1", clientId: "u1", contractProjectId: 1 }));

    await assignFreelancer(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("deployProject rejects already deployed", async () => {
    const req = { params: { id: "p1" }, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    Project.findById.mockResolvedValue({ _id: "p1", contractProjectId: 2 });

    await deployProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("deleteProject blocks disallowed status", async () => {
    const req = { params: { id: "p1" }, user: { _id: "u1", role: "client" } };
    const res = resFactory();

    Project.findById.mockResolvedValue({ _id: "p1", clientId: "u1", status: "InProgress" });

    await deleteProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
