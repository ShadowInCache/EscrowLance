import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(PORT, () => {
      console.log(`API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err.message);
    process.exit(1);
  }
};

start();
