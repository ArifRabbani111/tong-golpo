const { NextResponse } = require("next/server");
const { getUserFromRequest, requireAuth } = require("../../../../lib/auth");
const { getDisplayName } = require("../../../../lib/displayName");
const { prisma } = require("../../../../lib/db");

async function GET(req) {
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      OR: [
        { nickname: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, nickname: true },
    take: 10,
  });

  return NextResponse.json(
    users.map((u) => ({ id: u.id, nickname: getDisplayName(u) }))
  );
}

module.exports = { GET };
