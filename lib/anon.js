const { prisma } = require("./db");
const crypto = require("crypto");

/**
 * Get or create an anonymous user.
 * Uses browser fingerprint stored in localStorage to maintain consistency.
 */
async function getOrCreateAnonUser(sessionId) {
  // Check if anon user exists
  let user = await prisma.user.findFirst({
    where: { nickname: `anon_${sessionId}` },
  });

  if (!user) {
    // Create new anon user
    user = await prisma.user.create({
      data: {
        nickname: `anon_${sessionId}`, // e.g. "anon_a3f2b1c9" — shows they're anon but consistent
      },
    });
  }

  return user;
}

/**
 * Generate a unique session ID for this browser.
 */
function generateSessionId() {
  return crypto.randomBytes(4).toString("hex");
}

module.exports = { getOrCreateAnonUser, generateSessionId };