import mongoose from "mongoose";

export const connectDB = async (mongoUri) => {
  try {
    await mongoose.connect(mongoUri, { dbName: "chainescrow" });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error", err.message);
    throw err;
  }
};
