const MAX_MEMORY_ENTRIES = 200;

// Entries live for 2x the requested TTL: the first half is "fresh" (served
// directly), the second half is "stale" and only returned via getStale() so
// the caller can attempt conditional revalidation (ETag/If-Modified-Since)
// before falling back to a full re-fetch.

function createMemoryCacheStore() {
  const cache = new Map();

  function readEntry(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expires <= Date.now()) {
      cache.delete(key);
      return null;
    }
    return entry;
  }

  return {
    async get(key, ttlSeconds) {
      const entry = readEntry(key);
      if (!entry) return null;
      return entry.expires - Date.now() > ttlSeconds * 1000
        ? entry.value
        : null;
    },

    async getStale(key) {
      return readEntry(key)?.value ?? null;
    },

    async set(key, value, ttlSeconds) {
      cache.set(key, { value, expires: Date.now() + ttlSeconds * 2 * 1000 });
      if (cache.size > MAX_MEMORY_ENTRIES) {
        const [oldestKey] = cache.keys();
        cache.delete(oldestKey);
      }
    },

    async touch(key, ttlSeconds) {
      const entry = cache.get(key);
      if (entry) entry.expires = Date.now() + ttlSeconds * 2 * 1000;
    },
  };
}

// Response bodies are Buffers, stored as base64 JSON strings in Redis.
// Freshness is derived from the remaining Redis TTL vs. the requested ttlSeconds.
function createRedisCacheStore(redis) {
  async function readEntry(key) {
    const value = await redis.get(key);
    if (!value) return null;
    return { ...value, body: Buffer.from(value.body, "base64") };
  }

  return {
    async get(key, ttlSeconds) {
      const [value, ttl] = await Promise.all([readEntry(key), redis.ttl(key)]);
      return value && ttl > ttlSeconds ? value : null;
    },

    async getStale(key) {
      return readEntry(key);
    },

    async set(key, value, ttlSeconds) {
      await redis.set(
        key,
        { ...value, body: value.body.toString("base64") },
        { ex: ttlSeconds * 2 },
      );
    },

    async touch(key, ttlSeconds) {
      await redis.expire(key, ttlSeconds * 2);
    },
  };
}

export function createCacheStore(redis) {
  return redis ? createRedisCacheStore(redis) : createMemoryCacheStore();
}
