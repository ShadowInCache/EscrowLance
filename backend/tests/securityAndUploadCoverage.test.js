import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { errorHandler } from "../src/middleware/errorMiddleware.js";
import { uploadFileBuffer, uploadJsonPayload } from "../src/services/cloudinaryUploadService.js";

const mockUploadStream = jest.fn();
const mockUpload = jest.fn();

jest.mock("../src/config/cloudinary.js", () => ({
  getCloudinary: jest.fn(() => ({
    uploader: {
      upload_stream: mockUploadStream,
      upload: mockUpload,
    },
  })),
}));

const resFactory = () => ({
  statusCode: 200,
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("error middleware coverage", () => {
  it("handles mongoose validation errors", () => {
    const res = resFactory();
    errorHandler({ name: "ValidationError", message: "bad" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles cast errors", () => {
    const res = resFactory();
    errorHandler({ name: "CastError", message: "bad cast" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles duplicate key errors", () => {
    const res = resFactory();
    errorHandler({ name: "MongoServerError", code: 11000 }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("handles multer errors", () => {
    const res = resFactory();
    errorHandler({ name: "MulterError", message: "too large" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles unsupported file type message", () => {
    const res = resFactory();
    errorHandler({ message: "Unsupported file type" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles generic errors", () => {
    const res = resFactory();
    res.statusCode = 500;
    errorHandler({ message: "unexpected", stack: "s" }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "unexpected" }));
  });
});

describe("cloudinary upload service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploadFileBuffer uploads binary using upload_stream", async () => {
    mockUploadStream.mockImplementation((_opts, callback) => ({
      end: () => callback(null, { secure_url: "https://cloudinary.example/file", public_id: "proof-1" }),
    }));

    const result = await uploadFileBuffer({
      buffer: Buffer.from("hello"),
      filename: "proof.txt",
      mimetype: "text/plain",
    });

    expect(mockUploadStream).toHaveBeenCalled();
    expect(result.secure_url).toBe("https://cloudinary.example/file");
  });

  it("uploadJsonPayload uploads metadata as raw asset", async () => {
    mockUpload.mockResolvedValue({ secure_url: "https://cloudinary.example/json", public_id: "meta-1" });

    const result = await uploadJsonPayload({ hello: "world" });

    expect(mockUpload).toHaveBeenCalled();
    expect(result.secure_url).toBe("https://cloudinary.example/json");
  });
});
