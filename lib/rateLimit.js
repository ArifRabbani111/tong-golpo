const { redisIncr } = require("./redis");

async function checkRateLimit(key, maxCount, windowSeconds) {
  const count = await redisIncr(key, windowSeconds);
  return count <= maxCount;
}

async function checkUserMessageRateLimit(userId) {
  const key = `ratelimit:msg:${userId}`;
  return checkRateLimit(key, 10, 60);
}

async function checkIpRateLimit(ip, action, maxCount, windowSeconds) {
  const key = `ratelimit:${action}:${ip}`;
  return checkRateLimit(key, maxCount, windowSeconds);
}

module.exports = { checkUserMessageRateLimit, checkIpRateLimit };
