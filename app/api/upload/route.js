const { NextResponse } = require("next/server");
const { getUserFromRequest, requireAuth } = require("../../../../lib/auth");
const { checkUserMessageRateLimit } = require("../../../../lib/rateLimit");
const { uploadToCloudinary, isCloudinaryConfigured } = require("../../../../lib/cloudinary");

async function POST(req) {
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Media uploads are not configured." },
      { status: 503 }
    );
  }

  const allowed = await checkUserMessageRateLimit(user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit: 10 uploads per minute." },
      { status: 429 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const result = await uploadToCloudinary(buffer, mimeType);

    return NextResponse.json({
      url: result.url,
      mediaType: result.mediaType,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Upload failed." },
      { status: 400 }
    );
  }
}

module.exports = { POST };
