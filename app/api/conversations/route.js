const { NextResponse } = require("next/server");
const { prisma } = require("../../../../lib/db");
const { getUserFromRequest, requireAuth } = require("../../../../lib/auth");
const { getDisplayName } = require("../../../../lib/displayName");

async function GET(req) {
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, email: true, nickname: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              user: { select: { id: true, email: true, nickname: true } },
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const conversations = participations.map(({ conversation }) => {
    const other = conversation.participants
      .map((p) => p.user)
      .find((u) => u.id !== user.id);
    const lastMsg = conversation.messages[0];

    return {
      id: conversation.id,
      type: conversation.type,
      updatedAt: conversation.updatedAt,
      otherUser: other
        ? { id: other.id, nickname: getDisplayName(other) }
        : null,
      lastMessage: lastMsg
        ? {
            body: lastMsg.body,
            createdAt: lastMsg.createdAt,
            nickname: getDisplayName(lastMsg.user),
          }
        : null,
    };
  });

  return NextResponse.json(conversations);
}

async function POST(req) {
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const participantId = body?.participantId?.toString();

  if (!participantId) {
    return NextResponse.json({ error: "participantId is required." }, { status: 400 });
  }
  if (participantId === user.id) {
    return NextResponse.json({ error: "You can't message yourself." }, { status: 400 });
  }

  const other = await prisma.user.findUnique({ where: { id: participantId } });
  if (!other) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      type: "dm",
      AND: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { userId: participantId } } },
      ],
    },
    include: {
      participants: {
        include: { user: { select: { id: true, email: true, nickname: true } } },
      },
    },
  });

  if (existing) {
    const otherUser = existing.participants.map((p) => p.user).find((u) => u.id !== user.id);
    return NextResponse.json({
      id: existing.id,
      otherUser: { id: otherUser.id, nickname: getDisplayName(otherUser) },
    });
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "dm",
      participants: {
        create: [{ userId: user.id }, { userId: participantId }],
      },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, email: true, nickname: true } } },
      },
    },
  });

  const otherUser = conversation.participants.map((p) => p.user).find((u) => u.id !== user.id);

  return NextResponse.json(
    {
      id: conversation.id,
      otherUser: { id: otherUser.id, nickname: getDisplayName(otherUser) },
    },
    { status: 201 }
  );
}

module.exports = { GET, POST };
