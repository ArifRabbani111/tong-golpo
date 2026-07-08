const { NextResponse } = require("next/server");
const { prisma } = require("../../../../../lib/db");
const { getUserFromRequest, requireAuth } = require("../../../../../lib/auth");
const { checkUserMessageRateLimit } = require("../../../../../lib/rateLimit");
const { formatMessage } = require("../../../../../lib/displayName");
const { triggerConversationMessage } = require("../../../../../lib/pusher");

const MAX_BODY_LEN = 500;
const userInclude = { user: { select: { id: true, email: true, nickname: true } } };

async function assertParticipant(conversationId, userId) {
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });
  return Boolean(participant);
}

async function GET(req, { params }) {
  const { id } = params;
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  const isParticipant = await assertParticipant(id, user.id);
  if (!isParticipant) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");

  const where = { conversationId: id };
  if (after) {
    where.createdAt = { gt: new Date(after) };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 200,
    include: userInclude,
  });

  return NextResponse.json(messages.map(formatMessage));
}

async function POST(req, { params }) {
  const { id } = params;
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  const isParticipant = await assertParticipant(id, user.id);
  if (!isParticipant) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const allowed = await checkUserMessageRateLimit(user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit: 10 messages per minute." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const text = body?.body?.toString().trim() ?? "";
  const mediaUrl = body?.mediaUrl?.toString().trim() || null;
  const mediaType = body?.mediaType?.toString().trim() || null;

  if (!text && !mediaUrl) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }
  if (text.length > MAX_BODY_LEN) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_BODY_LEN} characters.` },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      userId: user.id,
      body: text || (mediaType === "gif" ? "sent a GIF" : "sent an image"),
      mediaUrl,
      mediaType,
    },
    include: userInclude,
  });

  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  const formatted = formatMessage(message);
  await triggerConversationMessage(id, formatted);

  return NextResponse.json(formatted, { status: 201 });
}

module.exports = { GET, POST };
