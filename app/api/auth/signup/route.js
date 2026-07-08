const { NextResponse } = require("next/server");
const bcrypt = require("bcryptjs");
const { prisma } = require("../../../../lib/db");
const { generateToken } = require("../../../../lib/jwt");
const { randomNickname } = require("../../../../lib/nickname");

async function POST(req) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  const password = body?.password?.toString();
  const nickname = body?.nickname?.toString().trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const displayName = nickname && nickname.length <= 30 ? nickname : randomNickname();

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      nickname: displayName,
    },
  });

  const token = generateToken(user.id);

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      token,
      isAnonymous: false,
    },
    { status: 201 }
  );
}

module.exports = { POST };
