import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { listFreelancers } from "../src/controllers/userController.js";
import { listTransactions, saveTransaction } from "../src/controllers/transactionController.js";
import { uploadFile, uploadMetadata } from "../src/controllers/uploadController.js";
import User from "../src/models/User.js";
import Transaction from "../src/models/Transaction.js";

jest.mock("../src/models/User.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock("../src/models/Transaction.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../src/ipfs/pinataClient.js", () => ({
  uploadBuffer: jest.fn(async () => ({ IpfsHash: "QmFile" })),
  uploadJson: jest.fn(async () => ({ IpfsHash: "QmJson" })),
}));

const resFactory = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("misc controllers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("listFreelancers returns sorted list", async () => {
    const req = {};
    const res = resFactory();
    const payload = [{ _id: "f1" }];

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(payload),
      }),
    });

    await listFreelancers(req, res);

    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it("listTransactions with filter", async () => {
    const req = { query: { projectId: "p1" } };
    const res = resFactory();

    Transaction.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: "t1" }]) });

    await listTransactions(req, res);

    expect(Transaction.find).toHaveBeenCalledWith({ projectId: "p1" });
    expect(res.json).toHaveBeenCalled();
  });

  it("saveTransaction creates doc", async () => {
    const req = { body: { action: "x" } };
    const res = resFactory();

    Transaction.create.mockResolvedValue({ _id: "t1" });

    await saveTransaction(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ _id: "t1" });
  });

  it("uploadFile requires file", async () => {
    const req = {};
    const res = resFactory();

    await uploadFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("uploadFile success", async () => {
    const req = { file: { buffer: Buffer.from("x"), originalname: "a.txt" } };
    const res = resFactory();

    await uploadFile(req, res);

    expect(res.json).toHaveBeenCalledWith({ ipfsHash: "QmFile" });
  });

  it("uploadMetadata success", async () => {
    const req = { body: { hello: "world" } };
    const res = resFactory();

    await uploadMetadata(req, res);

    expect(res.json).toHaveBeenCalledWith({ ipfsHash: "QmJson" });
  });
});
