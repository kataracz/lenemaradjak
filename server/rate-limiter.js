import { resolveByHost } from "./host-config.js";

// Per-host upstream request limits. Intentionally generous - this is a
// circuit-breaker against bugs/abuse, not a precise quota enforcer.
export const PER_HOST_LIMITS = {
  "googleapis.com": { max: 20, windowMs: 60_000 },
  default: { max: 15, windowMs: 60_000 },
};

function resolveLimits(hostname) {
  return resolveByHost(hostname, PER_HOST_LIMITS);
}

function createMemoryRateLimiter() {
  const windows = new Map();

  return {
    async check(hostname) {
      const { max, windowMs } = resolveLimits(hostname);
      const now = Date.now();
      const cutoff = now - windowMs;
      const timestamps = windows.get(hostname) ?? [];
      const recent = timestamps.filter((t) => t > cutoff);

      if (recent.length >= max) {
        const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
        windows.set(hostname, recent);
        return { allowed: false, retryAfter };
      }

      recent.push(now);
      windows.set(hostname, recent);
      return { allowed: true };
    },
  };
}

// Fixed windows can burst up to 2x the limit at window boundaries — acceptable
// tradeoff for a single round trip per check vs. sorted-set sliding windows.
function createRedisRateLimiter(redis) {
  return {
    async check(hostname) {
      const { max, windowMs } = resolveLimits(hostname);
      const bucket = Math.floor(Date.now() / windowMs);
      const key = `ratelimit:${hostname}:${bucket}`;

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      if (count > max) {
        const retryAfter = Math.ceil(
          ((bucket + 1) * windowMs - Date.now()) / 1000,
        );
        return { allowed: false, retryAfter };
      }

      return { allowed: true };
    },
  };
}

export function createRateLimiter(redis) {
  return redis ? createRedisRateLimiter(redis) : createMemoryRateLimiter();
}
