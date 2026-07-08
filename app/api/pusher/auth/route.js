const { NextResponse } = require("next/server");
const { prisma } = require("../../../../lib/db");
const { getUserFromRequest, requireAuth } = require("../../../../lib/auth");
const { getPusherServer } = require("../../../../lib/pusher");

async function POST(req) {
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json({ error: "Pusher not configured." }, { status: 503 });
  }

  const body = await req.formData().catch(() => null);
  const socketId = body?.get("socket_id")?.toString();
  const channelName = body?.get("channel_name")?.toString();

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing socket_id or channel_name." }, { status: 400 });
  }

  const match = channelName.match(/^private-conversation-(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid channel." }, { status: 403 });
  }

  const conversationId = match[1];
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: user.id },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant." }, { status: 403 });
  }

  const auth = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(auth);
}

module.exports = { POST };
