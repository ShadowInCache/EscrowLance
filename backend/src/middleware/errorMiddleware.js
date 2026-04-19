export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, _req, res, _next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  if (err?.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  if (err?.name === "CastError") {
    return res.status(400).json({ message: "Invalid identifier format" });
  }

  if (err?.name === "MongoServerError" && err?.code === 11000) {
    return res.status(409).json({ message: "Duplicate resource" });
  }

  if (err?.name === "MulterError") {
    return res.status(400).json({ message: err.message || "Upload failed" });
  }

  if (String(err?.message || "").includes("Unsupported file type")) {
    return res.status(400).json({ message: "Unsupported file type" });
  }

  return res.status(statusCode).json({
    message: err.message || "Server error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
};
