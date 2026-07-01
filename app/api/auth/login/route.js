const { NextResponse } = require("next/server");
const bcrypt = require("bcryptjs");
const { prisma } = require("../../../lib/db");
const { generateToken } = require("../../../lib/jwt");
const { getOrCreateAnonUser } = require("../../../lib/anon");

async function POST(req) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  const password = body?.password?.toString();
  const isAnon = body?.anonymous === true;

  // Anonymous login
  if (isAnon) {
    const sessionId = body?.sessionId; // should come from client
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required." },
        { status: 400 }
      );
    }

    const user = await getOrCreateAnonUser(sessionId);
    const token = generateToken(user.id);

    return NextResponse.json({
      id: user.id,
      email: null,
      nickname: user.nickname,
      token,
      isAnonymous: true,
    });
  }

  // Regular email login
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Email or password incorrect." },
      { status: 401 }
    );
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return NextResponse.json(
      { error: "Email or password incorrect." },
      { status: 401 }
    );
  }

  const token = generateToken(user.id);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    token,
    isAnonymous: false,
  });
}

module.exports = { POST };