import { getCloudinary } from "../config/cloudinary.js";

const toDataUri = (buffer, mimetype) => `data:${mimetype};base64,${buffer.toString("base64")}`;

export const uploadFileBuffer = async ({ buffer, filename, mimetype }) => {
  const cloudinary = getCloudinary();
  const folder = process.env.CLOUDINARY_FOLDER || "escrowlance/proofs";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        public_id: `${Date.now()}-${filename.replace(/[^a-zA-Z0-9_.-]/g, "_")}`,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    stream.end(buffer);
  });
};

export const uploadJsonPayload = async (payload) => {
  const cloudinary = getCloudinary();
  const folder = process.env.CLOUDINARY_FOLDER || "escrowlance/proofs";
  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const dataUri = toDataUri(body, "application/json");

  return cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "raw",
    public_id: `${Date.now()}-metadata.json`,
    overwrite: false,
  });
};
