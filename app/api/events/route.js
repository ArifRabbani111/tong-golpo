const { NextResponse } = require("next/server");
const { prisma } = require("../../../lib/db");
const { getCachedEvents, setCachedEvents, invalidateEventsCache } = require("../../../lib/cache");
const { checkIpRateLimit } = require("../../../lib/rateLimit");

const VALID_STATUS = ["upcoming", "live", "ended"];

function getIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function fetchEventsFromDb() {
  const events = await prisma.event.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { messages: true } },
    },
  });

  const order = { live: 0, upcoming: 1, ended: 2 };
  events.sort((a, b) => order[a.status] - order[b.status]);
  return events;
}

async function GET() {
  const cached = await getCachedEvents();
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT" },
    });
  }

  const events = await fetchEventsFromDb();
  await setCachedEvents(events);

  return NextResponse.json(events, {
    headers: { "X-Cache": "MISS" },
  });
}

async function POST(req) {
  const ip = getIp(req);
  const allowed = await checkIpRateLimit(ip, "event-create", 1, 10);
  if (!allowed) {
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

  await invalidateEventsCache();

  return NextResponse.json(event, { status: 201 });
}

module.exports = { GET, POST };
