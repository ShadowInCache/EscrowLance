import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import { protect, requireRole } from "../src/middleware/authMiddleware.js";
import { notFound, errorHandler } from "../src/middleware/errorMiddleware.js";
import User from "../src/models/User.js";

jest.mock("../src/models/User.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const resFactory = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  it("protect returns 401 without token", async () => {
    const req = { headers: {} };
    const res = resFactory();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("protect sets req.user and calls next", async () => {
    const token = jwt.sign({ id: "u1" }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = resFactory();
    const next = jest.fn();

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "u1", role: "client" }),
    });

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ _id: "u1", role: "client" });
  });

  it("requireRole blocks disallowed role", () => {
    const req = { user: { role: "freelancer" } };
    const res = resFactory();
    const next = jest.fn();

    requireRole(["client"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("requireRole allows role", () => {
    const req = { user: { role: "client" } };
    const res = resFactory();
    const next = jest.fn();

    requireRole(["client", "admin"])(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("notFound passes 404 error", () => {
    const req = { originalUrl: "/missing" };
    const res = resFactory();
    const next = jest.fn();

    notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toContain("Not Found");
  });

  it("errorHandler emits stack in test mode", () => {
    const err = new Error("boom");
    const req = {};
    const res = resFactory();
    const next = jest.fn();

    res.statusCode = 200;
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }));
  });
});
