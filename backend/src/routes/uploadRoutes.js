import express from "express";
import multer from "multer";
import { uploadFile, uploadMetadata } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", protect, upload.single("file"), uploadFile);
router.post("/json", protect, uploadMetadata);

export default router;
