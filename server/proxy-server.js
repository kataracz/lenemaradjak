import express from "express";
import rateLimit from "express-rate-limit";
import PROXY_HOSTS_LIST from "../src/lib/proxy-hosts.json" with { type: "json" };
import { createRedisClient } from "./redis-client.js";
import { createCacheStore, isCacheableStatus } from "./cache-store.js";
import { createRateLimiter } from "./rate-limiter.js";
import { resolveByHost } from "./host-config.js";
import { validateTarget, fetchWithRedirectGuard } from "./redirect-guard.js";

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
const DEV_CONTACT = process.env.DEV_CONTACT;

const ALLOWED_HOSTS = new Set(PROXY_HOSTS_LIST);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GOOGLE_API_HOSTS = new Set(["googleapis.com", "www.googleapis.com"]);

if (!YOUTUBE_API_KEY) {
  console.warn(
    "YOUTUBE_API_KEY is not set — YouTube requests will return 501.",
  );
}

const redis = createRedisClient();
const cacheStore = createCacheStore(redis);
const hostRateLimiter = createRateLimiter(redis);

const inflight = new Map();
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
const RESPONSE_TOO_LARGE = "Upstream response too large";

// With a shared cache every visitor benefits from one upstream fetch, so these
// can be longer than the per-browser client-side cache TTLs.
const CACHE_TTL_BY_HOST = {
  "googleapis.com": 30 * 60, // quota preservation
  default: 15 * 60, // matches client-side RSS cache TTL
};

function getCacheTtlSeconds(hostname) {
  return resolveByHost(hostname, CACHE_TTL_BY_HOST);
}

app.set("trust proxy", 1);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 });
app.use(limiter);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string")
    return res.status(400).json({ error: "Missing url" });

  const { target, error } = validateTarget(url, ALLOWED_HOSTS);
  if (error) {
    return res.status(error.status).json(error.body);
  }

  if (GOOGLE_API_HOSTS.has(target.hostname)) {
    if (!YOUTUBE_API_KEY) {
      return res.status(501).json({ error: "youtube_not_configured" });
    }
    target.searchParams.set("key", YOUTUBE_API_KEY);
  }
  const fetchUrl = target.toString();

  const cacheKey = url;
  const ttl = getCacheTtlSeconds(target.hostname);

  const cached = await cacheStore.get(cacheKey, ttl);
  if (cached) {
    res.set("Content-Type", cached.contentType);
    return res.status(200).send(cached.body);
  }

  // Deduplicate concurrent upstream requests for the same URL. If another
  // request is already in flight, wait for it to finish and serve from cache.
  if (inflight.has(cacheKey)) {
    await inflight.get(cacheKey);
    const fresh = await cacheStore.get(cacheKey, ttl);
    if (fresh) {
      res.set("Content-Type", fresh.contentType);
      return res.status(200).send(fresh.body);
    }
    return res.status(502).json({ error: "Failed to fetch upstream" });
  }

  const { allowed, retryAfter } = await hostRateLimiter.check(target.hostname);
  if (!allowed) {
    return res
      .status(429)
      .set("Retry-After", String(retryAfter))
      .json({ error: "Too many upstream requests for this host", retryAfter });
  }

  // A stale (expired but not yet evicted) entry, used for conditional
  // revalidation so an unchanged upstream response doesn't need re-fetching.
  const stale = await cacheStore.getStale(cacheKey);

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetchWithRedirectGuard(
        fetchUrl,
        {
          signal: controller.signal,
          headers: {
            "User-Agent": `Lenemaradjak/1.0 WIP RSS Reader  (personal aggregator, contact: ${DEV_CONTACT ?? "n/a"})`,
            ...(stale?.lastModified
              ? { "If-Modified-Since": stale.lastModified }
              : {}),
            ...(stale?.etag ? { "If-None-Match": stale.etag } : {}),
          },
        },
        ALLOWED_HOSTS,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 304 && stale) {
      await cacheStore.touch(cacheKey, ttl);
      return { status: 200, contentType: stale.contentType, body: stale.body };
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      const err = new Error(RESPONSE_TOO_LARGE);
      err.statusCode = 413;
      throw err;
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();

    if (body.byteLength > MAX_BODY_BYTES) {
      const err = new Error(RESPONSE_TOO_LARGE);
      err.statusCode = 413;
      throw err;
    }

    const buffer = Buffer.from(body);

    if (isCacheableStatus(response.status)) {
      const etag = response.headers.get("etag") ?? null;
      const lastModified = response.headers.get("last-modified") ?? null;
      await cacheStore.set(
        cacheKey,
        { contentType, body: buffer, etag, lastModified },
        ttl,
      );
    }

    return { status: response.status, contentType, body: buffer };
  })();

  // Store a never-rejecting version so waiters can safely await it.
  inflight.set(
    cacheKey,
    fetchPromise.catch(() => {}),
  );

  try {
    const { status, contentType, body } = await fetchPromise;
    res.set("Content-Type", contentType);
    return res.status(status).send(body);
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Upstream request timed out" });
    }
    if (err.statusCode) {
      return res
        .status(err.statusCode)
        .json(err.body ?? { error: err.message });
    }
    console.error("Upstream fetch failed:", err);
    return res.status(502).json({ error: "Failed to fetch upstream" });
  } finally {
    inflight.delete(cacheKey);
  }
});

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Proxy server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
