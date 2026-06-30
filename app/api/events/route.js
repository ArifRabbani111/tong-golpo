const { NextResponse } = require("next/server");
const { prisma } = require("../../../lib/db");

async function GET() {
  const events = await prisma.event.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { messages: true } },
    },
  });

  // sort: live first, then upcoming, then ended
  const order = { live: 0, upcoming: 1, ended: 2 };
  events.sort((a, b) => order[a.status] - order[b.status]);

  return NextResponse.json(events);
}

const VALID_STATUS = ["upcoming", "live", "ended"];
const lastCreate = new Map();
const MIN_INTERVAL_MS = 10000; // 1 new event per 10s per IP, keeps it simple but discourages spam

function getIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function POST(req) {
  const ip = getIp(req);
  const now = Date.now();
  const last = lastCreate.get(ip) || 0;
  if (now - last < MIN_INTERVAL_MS) {
    return NextResponse.json(
      { error: "Slow down a little before adding another event." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const title = body?.title?.toString().trim();
  const subtitle = body?.subtitle?.toString().trim() || null;
  let status = body?.status?.toString().trim() || "upcoming";

  if (!title || title.length > 80) {
    return NextResponse.json(
      { error: "Give it a title between 1 and 80 characters." },
      { status: 400 }
    );
  }
  if (subtitle && subtitle.length > 100) {
    return NextResponse.json(
      { error: "Keep the subtitle under 100 characters." },
      { status: 400 }
    );
  }
  if (!VALID_STATUS.includes(status)) {
    status = "upcoming";
  }

  const event = await prisma.event.create({
    data: { title, subtitle, status },
  });

  lastCreate.set(ip, now);

  return NextResponse.json(event, { status: 201 });
}

module.exports = { GET, POST };
