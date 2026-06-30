const { NextResponse } = require("next/server");
const { prisma } = require("../../../../../lib/db");
const { randomNickname } = require("../../../../../lib/nickname");

// very simple in-memory rate limit: 1 message per 3 seconds per IP
const lastPost = new Map();
const MIN_INTERVAL_MS = 3000;
const MAX_BODY_LEN = 500;

function getIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function GET(req, { params }) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after"); // ISO timestamp, optional

  const where = { eventId: id };
  if (after) {
    where.createdAt = { gt: new Date(after) };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json(messages);
}

async function POST(req, { params }) {
  const { id } = params;
  const ip = getIp(req);

  const now = Date.now();
  const last = lastPost.get(ip) || 0;
  if (now - last < MIN_INTERVAL_MS) {
    return NextResponse.json(
      { error: "Slow down a little before posting again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const text = body?.body?.toString().trim();
  let nickname = body?.nickname?.toString().trim();

  if (!text) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }
  if (text.length > MAX_BODY_LEN) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_BODY_LEN} characters.` },
      { status: 400 }
    );
  }
  if (!nickname || nickname.length > 30) {
    nickname = randomNickname();
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: { eventId: id, nickname, body: text },
  });

  lastPost.set(ip, now);

  return NextResponse.json(message, { status: 201 });
}

module.exports = { GET, POST };
