import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { register, login, profile } from "../src/controllers/authController.js";
import User from "../src/models/User.js";

jest.mock("../src/models/User.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const mockReqRes = (body = {}, user = null) => {
  const req = { body, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
};

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a new user", async () => {
    const { req, res } = mockReqRes({
      name: "Client",
      email: "client@mail.com",
      password: "Password123",
      role: "client",
      walletAddress: "0x123",
    });

    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: "u1",
      name: "Client",
      email: "client@mail.com",
      role: "client",
      walletAddress: "0x123",
    });

    await register(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: "client@mail.com" });
    expect(User.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });

  it("rejects duplicate register", async () => {
    const { req, res } = mockReqRes({
      name: "Client",
      email: "client@mail.com",
      password: "Password123",
      role: "client",
      walletAddress: "0x123",
    });

    User.findOne.mockResolvedValue({ _id: "u1" });

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
  });

  it("login rejects invalid email", async () => {
    const { req, res } = mockReqRes({ email: "none@mail.com", password: "Password123" });
    User.findOne.mockResolvedValue(null);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  it("login rejects invalid password", async () => {
    const { req, res } = mockReqRes({ email: "x@mail.com", password: "bad" });
    User.findOne.mockResolvedValue({ matchPassword: jest.fn().mockResolvedValue(false) });

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  it("login succeeds", async () => {
    const { req, res } = mockReqRes({ email: "x@mail.com", password: "Password123" });
    User.findOne.mockResolvedValue({
      _id: "u1",
      name: "X",
      email: "x@mail.com",
      role: "freelancer",
      walletAddress: "0xabc",
      matchPassword: jest.fn().mockResolvedValue(true),
    });

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });

  it("profile returns req.user", async () => {
    const { req, res } = mockReqRes({}, { _id: "u1", email: "x@mail.com" });

    await profile(req, res);

    expect(res.json).toHaveBeenCalledWith({ user: req.user });
  });
});
