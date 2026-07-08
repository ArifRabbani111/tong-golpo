const { NextResponse } = require("next/server");
const { prisma } = require("../../../../../../lib/db");
const { getUserFromRequest, requireAuth } = require("../../../../../../lib/auth");

const MAX_BODY_LEN = 500;

async function DELETE(req, { params }) {
  const { id: eventId, messageId } = params;
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  const message = await prisma.message.findFirst({
    where: { id: messageId, eventId },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (message.userId !== user.id) {
    return NextResponse.json({ error: "You can only delete your own messages." }, { status: 403 });
  }

  await prisma.message.delete({ where: { id: messageId } });

  return NextResponse.json({ ok: true });
}

async function PATCH(req, { params }) {
  const { id: eventId, messageId } = params;
  const user = await getUserFromRequest(req);
  const authError = requireAuth(user);
  if (authError) return authError;

  const message = await prisma.message.findFirst({
    where: { id: messageId, eventId },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (message.userId !== user.id) {
    return NextResponse.json({ error: "You can only edit your own messages." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const text = body?.body?.toString().trim();
  if (!text) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }
  if (text.length > MAX_BODY_LEN) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_BODY_LEN} characters.` },
      { status: 400 }
    );
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { body: text },
    include: { user: { select: { id: true, email: true, nickname: true } } },
  });

  const { formatMessage } = require("../../../../../../lib/displayName");
  return NextResponse.json(formatMessage(updated));
}

module.exports = { DELETE, PATCH };
