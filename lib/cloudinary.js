const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function getMediaType(mimeType) {
  if (mimeType === "image/gif") return "gif";
  if (mimeType?.startsWith("image/")) return "image";
  return null;
}

async function uploadToCloudinary(buffer, mimeType) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error("Only JPEG, PNG, GIF, and WebP images are allowed.");
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error("File must be under 5 MB.");
  }

  const { v2: cloudinary } = require("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "tong-golpo",
    resource_type: "image",
  });

  return {
    url: result.secure_url,
    mediaType: getMediaType(mimeType),
  };
}

module.exports = {
  isCloudinaryConfigured,
  uploadToCloudinary,
  getMediaType,
  ALLOWED_TYPES,
  MAX_BYTES,
};
