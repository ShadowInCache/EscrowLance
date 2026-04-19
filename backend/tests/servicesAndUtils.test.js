import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import nodemailer, { __mockTransport } from "nodemailer";
import { generateToken } from "../src/utils/token.js";
import { connectDB } from "../src/config/db.js";
import * as blockchainService from "../src/services/blockchainService.js";
import { sendMail } from "../src/services/emailService.js";
import mongoose from "mongoose";

jest.mock("mongoose", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
  },
}));

jest.mock("../src/blockchain/contractClient.js", () => ({
  getContract: jest.fn(() => ({
    createProject: jest.fn(async () => "create"),
    fundProject: jest.fn(async () => "fund"),
    assignFreelancer: jest.fn(async () => "assign"),
    submitMilestone: jest.fn(async () => "submit"),
    approveMilestone: jest.fn(async () => "approve"),
    releasePayment: jest.fn(async () => "release"),
    raiseDispute: jest.fn(async () => "raise"),
    resolveDispute: jest.fn(async () => "resolve"),
    cancelProject: jest.fn(async () => "cancel"),
    refundClient: jest.fn(async () => "refund"),
  })),
}));

jest.mock("nodemailer", () => ({
  __esModule: true,
  ...(() => {
    const mockTransport = { sendMail: jest.fn() };
    return {
      __mockTransport: mockTransport,
      default: {
        createTransport: jest.fn(() => mockTransport),
      },
    };
  })(),
}));

describe("services and utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generateToken creates valid jwt", () => {
    const token = generateToken("u1");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe("u1");
  });

  it("connectDB delegates to mongoose.connect", async () => {
    mongoose.connect.mockResolvedValue({});

    await connectDB("mongodb://localhost/test");

    expect(mongoose.connect).toHaveBeenCalledWith(
      "mongodb://localhost/test",
      expect.objectContaining({ dbName: "chainescrow" })
    );
  });

  it("blockchain service wrappers call contract", async () => {
    await expect(blockchainService.createProjectOnChain({ title: "t", description: "d", budgetWei: 1n })).resolves.toBe("create");
    await expect(blockchainService.fundProjectOnChain({ projectId: 1, amountWei: "1" })).resolves.toBe("fund");
    await expect(blockchainService.assignFreelancerOnChain({ projectId: 1, freelancer: "0xabc" })).resolves.toBe("assign");
    await expect(blockchainService.submitMilestoneOnChain({ projectId: 1, milestoneId: 0, workHash: "w", amountWei: "1", title: "m", deadline: 0 })).resolves.toBe("submit");
    await expect(blockchainService.approveMilestoneOnChain({ projectId: 1, milestoneId: 0 })).resolves.toBe("approve");
    await expect(blockchainService.releasePaymentOnChain({ projectId: 1, milestoneId: 0 })).resolves.toBe("release");
    await expect(blockchainService.raiseDisputeOnChain({ projectId: 1, reason: "r" })).resolves.toBe("raise");
    await expect(blockchainService.resolveDisputeOnChain({ projectId: 1, refundClient: true })).resolves.toBe("resolve");
    await expect(blockchainService.cancelProjectOnChain({ projectId: 1 })).resolves.toBe("cancel");
    await expect(blockchainService.refundClientOnChain({ projectId: 1 })).resolves.toBe("refund");
  });

  it("sendMail skips if recipient missing", async () => {
    await sendMail({ to: "", subject: "s", html: "h" });
    expect(__mockTransport.sendMail).not.toHaveBeenCalled();
  });

  it("sendMail sends with default from", async () => {
    await sendMail({ to: "x@mail.com", subject: "s", html: "h" });
    expect(__mockTransport.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "x@mail.com" }));
  });
});
