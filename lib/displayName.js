const { randomNickname } = require("./nickname");

function getDisplayName(user) {
  if (!user) return "Anonymous";
  if (user.nickname && !user.nickname.startsWith("anon_")) {
    return user.nickname;
  }
  if (user.nickname?.startsWith("anon_")) {
    return user.nickname.replace(/^anon_/, "Guest ");
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return randomNickname();
}

function formatMessage(message) {
  const user = message.user;
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    userId: message.userId,
    nickname: getDisplayName(user),
    mediaUrl: message.mediaUrl ?? null,
    mediaType: message.mediaType ?? null,
    eventId: message.eventId ?? null,
    conversationId: message.conversationId ?? null,
  };
}

module.exports = { getDisplayName, formatMessage };
