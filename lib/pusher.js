let pusherServer = null;

function getPusherServer() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    return null;
  }
  if (!pusherServer) {
    const Pusher = require("pusher");
    pusherServer = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherServer;
}

function isPusherConfigured() {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.PUSHER_CLUSTER
  );
}

async function triggerEventMessage(eventId, message) {
  const pusher = getPusherServer();
  if (!pusher) return;
  await pusher.trigger(`event-${eventId}`, "new-message", message);
}

async function triggerConversationMessage(conversationId, message) {
  const pusher = getPusherServer();
  if (!pusher) return;
  await pusher.trigger(`private-conversation-${conversationId}`, "new-message", message);
}

module.exports = {
  getPusherServer,
  isPusherConfigured,
  triggerEventMessage,
  triggerConversationMessage,
};
