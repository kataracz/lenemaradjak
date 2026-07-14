import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCacheStore, isCacheableStatus } from "./cache-store.js";

describe("isCacheableStatus", () => {
  it("treats 2xx statuses as cacheable", () => {
    expect(isCacheableStatus(200)).toBe(true);
    expect(isCacheableStatus(204)).toBe(true);
    expect(isCacheableStatus(299)).toBe(true);
  });

  it("treats non-2xx statuses as not cacheable", () => {
    expect(isCacheableStatus(403)).toBe(false);
    expect(isCacheableStatus(404)).toBe(false);
    expect(isCacheableStatus(500)).toBe(false);
    expect(isCacheableStatus(301)).toBe(false);
    expect(isCacheableStatus(199)).toBe(false);
  });
});

describe("createCacheStore (in-memory, no Redis client)", () => {
  let store;

  beforeEach(() => {
    store = createCacheStore(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for a missing key", async () => {
    expect(await store.get("missing", 60)).toBeNull();
    expect(await store.getStale("missing")).toBeNull();
  });

  it("stores and retrieves a fresh value", async () => {
    const value = { contentType: "application/xml", body: Buffer.from("hi") };
    await store.set("key", value, 60);
    expect(await store.get("key", 60)).toEqual(value);
    expect(await store.getStale("key")).toEqual(value);
  });

  it("becomes stale (but revalidatable) after the TTL elapses", async () => {
    vi.useFakeTimers();
    const value = { contentType: "text/plain", body: Buffer.from("x") };
    await store.set("key", value, 60);

    vi.advanceTimersByTime(60_500);
    expect(await store.get("key", 60)).toBeNull();
    expect(await store.getStale("key")).toEqual(value);
  });

  it("is fully gone after the grace window (2x TTL) elapses", async () => {
    vi.useFakeTimers();
    const value = { contentType: "text/plain", body: Buffer.from("x") };
    await store.set("key", value, 60);

    vi.advanceTimersByTime(120_500);
    expect(await store.get("key", 60)).toBeNull();
    expect(await store.getStale("key")).toBeNull();
  });

  it("touch refreshes freshness without changing the value", async () => {
    vi.useFakeTimers();
    const value = { contentType: "text/plain", body: Buffer.from("x") };
    await store.set("key", value, 60);

    vi.advanceTimersByTime(60_500); // now stale
    expect(await store.get("key", 60)).toBeNull();

    await store.touch("key", 60);
    vi.advanceTimersByTime(30_000); // would be stale again without the touch
    expect(await store.get("key", 60)).toEqual(value);
  });

  it("evicts the oldest entry once over capacity", async () => {
    const value = (n) => ({
      contentType: "text/plain",
      body: Buffer.from(String(n)),
    });
    for (let i = 0; i < 201; i++) {
      await store.set(`key-${i}`, value(i), 60);
    }
    expect(await store.get("key-0", 60)).toBeNull();
    expect(await store.get("key-200", 60)).toEqual(value(200));
  });
});

describe("createCacheStore (Redis client)", () => {
  let redis;
  let store;

  beforeEach(() => {
    redis = { get: vi.fn(), set: vi.fn(), ttl: vi.fn(), expire: vi.fn() };
    store = createCacheStore(redis);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when Redis has no entry", async () => {
    redis.get.mockResolvedValue(null);
    redis.ttl.mockResolvedValue(-2);
    expect(await store.get("key", 60)).toBeNull();
    expect(await store.getStale("key")).toBeNull();
  });

  it("base64-encodes the body when writing with a TTL of 2x the requested seconds", async () => {
    const body = Buffer.from("hello world");
    await store.set("key", { contentType: "text/plain", body }, 900);

    expect(redis.set).toHaveBeenCalledWith(
      "key",
      { contentType: "text/plain", body: body.toString("base64") },
      { ex: 1800 },
    );
  });

  it("get returns the value when remaining TTL exceeds the requested freshness window", async () => {
    const body = Buffer.from("hello world");
    redis.get.mockResolvedValue({
      contentType: "text/plain",
      body: body.toString("base64"),
    });
    redis.ttl.mockResolvedValue(900);

    const result = await store.get("key", 600);
    expect(result.contentType).toBe("text/plain");
    expect(result.body).toEqual(body);
  });

  it("get returns null once the remaining TTL drops to the freshness window (stale)", async () => {
    const body = Buffer.from("hello world");
    redis.get.mockResolvedValue({
      contentType: "text/plain",
      body: body.toString("base64"),
    });
    redis.ttl.mockResolvedValue(600);

    expect(await store.get("key", 600)).toBeNull();
    const stale = await store.getStale("key");
    expect(stale.contentType).toBe("text/plain");
    expect(stale.body).toEqual(body);
  });

  it("touch extends the Redis TTL without rewriting the value", async () => {
    await store.touch("key", 600);
    expect(redis.expire).toHaveBeenCalledWith("key", 1200);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
