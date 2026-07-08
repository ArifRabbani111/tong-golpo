const { redisGet, redisSet, redisDel } = require("./redis");

const EVENTS_CACHE_KEY = "cache:events";
const EVENTS_TTL = 300; // 5 minutes

async function getCachedEvents() {
  const raw = await redisGet(EVENTS_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setCachedEvents(events) {
  await redisSet(EVENTS_CACHE_KEY, JSON.stringify(events), EVENTS_TTL);
}

async function invalidateEventsCache() {
  await redisDel(EVENTS_CACHE_KEY);
}

module.exports = { getCachedEvents, setCachedEvents, invalidateEventsCache, EVENTS_TTL };
