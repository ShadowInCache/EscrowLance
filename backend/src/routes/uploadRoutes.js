import express from "express";
import multer from "multer";
import { uploadFile, uploadMetadata } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const allowedMimeTypes = new Set(
	(process.env.ALLOWED_UPLOAD_MIME_TYPES ||
		"image/jpeg,image/png,image/webp,application/pdf,text/plain,application/zip,application/x-zip-compressed")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean)
);

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: Number(process.env.MAX_UPLOAD_FILE_SIZE_MB || 10) * 1024 * 1024,
	},
	fileFilter: (_req, file, cb) => {
		if (!allowedMimeTypes.has(file.mimetype)) {
			return cb(new Error("Unsupported file type"));
		}
		return cb(null, true);
	},
});

router.post("/", protect, upload.single("file"), uploadFile);
router.post("/json", protect, uploadMetadata);

export default router;
