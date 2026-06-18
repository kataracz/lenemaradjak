import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter, PER_HOST_LIMITS } from "./rate-limiter.js";

describe("createRateLimiter (in-memory, no Redis client)", () => {
  let limiter;

  beforeEach(() => {
    limiter = createRateLimiter(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the per-host limit", async () => {
    for (let i = 0; i < PER_HOST_LIMITS.default.max; i++) {
      expect(await limiter.check("example.com")).toEqual({ allowed: true });
    }
  });

  it("rejects requests over the per-host limit with a retryAfter", async () => {
    for (let i = 0; i < PER_HOST_LIMITS.default.max; i++) {
      await limiter.check("example.com");
    }
    const result = await limiter.check("example.com");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("tracks hosts independently", async () => {
    for (let i = 0; i < PER_HOST_LIMITS.default.max; i++) {
      await limiter.check("a.com");
    }
    expect(await limiter.check("b.com")).toEqual({ allowed: true });
  });

  it("applies the googleapis.com limit to matching subdomains", async () => {
    for (let i = 0; i < PER_HOST_LIMITS["googleapis.com"].max; i++) {
      expect(await limiter.check("www.googleapis.com")).toEqual({
        allowed: true,
      });
    }
    expect((await limiter.check("www.googleapis.com")).allowed).toBe(false);
  });

  it("allows requests again after the window passes", async () => {
    vi.useFakeTimers();
    for (let i = 0; i < PER_HOST_LIMITS.default.max; i++) {
      await limiter.check("example.com");
    }
    expect((await limiter.check("example.com")).allowed).toBe(false);

    vi.advanceTimersByTime(PER_HOST_LIMITS.default.windowMs + 1);
    expect((await limiter.check("example.com")).allowed).toBe(true);
  });
});

describe("createRateLimiter (Redis client)", () => {
  let redis;
  let limiter;

  beforeEach(() => {
    redis = { incr: vi.fn(), expire: vi.fn() };
    limiter = createRateLimiter(redis);
  });

  it("allows the first request and sets an expiry on the bucket key", async () => {
    redis.incr.mockResolvedValue(1);
    const result = await limiter.check("example.com");
    expect(result).toEqual({ allowed: true });
    expect(redis.expire).toHaveBeenCalledWith(
      expect.stringContaining("ratelimit:example.com:"),
      Math.ceil(PER_HOST_LIMITS.default.windowMs / 1000),
    );
  });

  it("does not re-set the expiry on subsequent requests", async () => {
    redis.incr.mockResolvedValue(2);
    await limiter.check("example.com");
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("rejects once the count exceeds the limit", async () => {
    redis.incr.mockResolvedValue(PER_HOST_LIMITS.default.max + 1);
    const result = await limiter.check("example.com");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});
