import { uploadBuffer, uploadJson } from "../ipfs/pinataClient.js";

export const uploadFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file provided" });
  const result = await uploadBuffer({ buffer: req.file.buffer, filename: req.file.originalname });
  res.json({ ipfsHash: result.IpfsHash });
};

export const uploadMetadata = async (req, res) => {
  const result = await uploadJson(req.body);
  res.json({ ipfsHash: result.IpfsHash });
};
