import { jest, describe, it, expect } from "@jest/globals";
import request from "supertest";

jest.mock("../src/blockchain/contractClient.js", () => ({
  getContract: jest.fn(() => ({
    target: "0xcontract",
    runner: {
      provider: {
        getNetwork: jest.fn(async () => ({ chainId: 11155111n, name: "sepolia" })),
        getCode: jest.fn(async () => "0x1234"),
      },
    },
    projectCount: jest.fn(async () => 1n),
  })),
}));

import app from "../src/app.js";

describe("health endpoint", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
