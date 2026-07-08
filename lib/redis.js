const memoryStore = new Map();

let client = null;
let connectPromise = null;

async function getRedis() {
  if (!process.env.REDIS_URL) return null;

  if (client?.isOpen) return client;

  if (!connectPromise) {
    const { createClient } = require("redis");
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => console.error("Redis error:", err.message));
    connectPromise = client.connect().then(() => client);
  }

  try {
    return await connectPromise;
  } catch (err) {
    console.error("Redis connect failed, using memory fallback:", err.message);
    connectPromise = null;
    client = null;
    return null;
  }
}

async function redisGet(key) {
  const redis = await getRedis();
  if (redis) {
    const val = await redis.get(key);
    return val ?? null;
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

async function redisSet(key, value, ttlSeconds) {
  const redis = await getRedis();
  if (redis) {
    if (ttlSeconds) {
      await redis.setEx(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
    return;
  }
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

async function redisDel(key) {
  const redis = await getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryStore.delete(key);
}

async function redisIncr(key, ttlSeconds) {
  const redis = await getRedis();
  if (redis) {
    const count = await redis.incr(key);
    if (count === 1 && ttlSeconds) {
      await redis.expire(key, ttlSeconds);
    }
    return count;
  }
  const entry = memoryStore.get(key);
  const now = Date.now();
  if (!entry || (entry.expiresAt && now > entry.expiresAt)) {
    memoryStore.set(key, {
      value: "1",
      expiresAt: ttlSeconds ? now + ttlSeconds * 1000 : null,
    });
    return 1;
  }
  const count = parseInt(entry.value, 10) + 1;
  memoryStore.set(key, { ...entry, value: String(count) });
  return count;
}

module.exports = { getRedis, redisGet, redisSet, redisDel, redisIncr };
