import mongoose from "mongoose";

export const connectDB = async (mongoUri) => {
  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || "chainescrow",
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 2),
      retryWrites: true,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error", err.message);
    throw err;
  }
};
