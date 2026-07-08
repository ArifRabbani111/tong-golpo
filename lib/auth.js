const { verifyToken } = require("./jwt");
const { prisma } = require("./db");

function getTokenFromRequest(req) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

async function getUserFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const userId = verifyToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, nickname: true },
  });

  return user;
}

function requireAuth(user) {
  if (!user) {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  return null;
}

module.exports = { getTokenFromRequest, getUserFromRequest, requireAuth };
