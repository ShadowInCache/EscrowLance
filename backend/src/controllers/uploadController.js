import { uploadFileBuffer, uploadJsonPayload } from "../services/cloudinaryUploadService.js";

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    const result = await uploadFileBuffer({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    return res.json({
      ipfsHash: result.secure_url,
      proofUrl: result.secure_url,
      storageProvider: "cloudinary",
      publicId: result.public_id,
    });
  } catch (err) {
    console.error("uploadFile error", err.message);
    return res.status(500).json({ message: "File upload failed" });
  }
};

export const uploadMetadata = async (req, res) => {
  try {
    const result = await uploadJsonPayload(req.body);
    return res.json({
      ipfsHash: result.secure_url,
      proofUrl: result.secure_url,
      storageProvider: "cloudinary",
      publicId: result.public_id,
    });
  } catch (err) {
    console.error("uploadMetadata error", err.message);
    return res.status(500).json({ message: "Metadata upload failed" });
  }
};
