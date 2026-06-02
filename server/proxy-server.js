import express from "express";
import rateLimit from "express-rate-limit";
import PROXY_HOSTS_LIST from "../src/lib/proxy-hosts.json" with { type: "json" };

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
const DEV_CONTACT = process.env.DEV_CONTACT;

const ALLOWED_HOSTS = new Set(PROXY_HOSTS_LIST);

const cache = new Map();
const inflight = new Map();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
const RESPONSE_TOO_LARGE = "Upstream response too large";

const PER_HOST_WINDOWS = new Map(); // hostname -> number[] (upstream request timestamps)
const PER_HOST_LIMITS = {
  "googleapis.com": { max: 20, windowMs: 60_000 },
  default: { max: 15, windowMs: 60_000 },
};

function checkPerHostRateLimit(hostname) {
  const { max, windowMs } =
    PER_HOST_LIMITS[hostname] ?? PER_HOST_LIMITS.default;
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = PER_HOST_WINDOWS.get(hostname) ?? [];
  const recent = timestamps.filter((t) => t > cutoff);
  if (recent.length >= max) {
    const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
    PER_HOST_WINDOWS.set(hostname, recent);
    return { allowed: false, retryAfter };
  }
  recent.push(now);
  PER_HOST_WINDOWS.set(hostname, recent);
  return { allowed: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expires < now) cache.delete(key);
  }
}, CACHE_TTL_MS);

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
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

  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return res.status(400).json({ error: "Only HTTP(S) URLs allowed" });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return res.status(403).json({ error: "Host not allowed" });
  }

  const cacheKey = url;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > now) {
    res.set("Content-Type", cached.contentType);
    return res.status(200).send(cached.body);
  }

  // Deduplicate concurrent upstream requests for the same URL. If another
  // request is already in flight, wait for it to finish and serve from cache.
  if (inflight.has(cacheKey)) {
    await inflight.get(cacheKey);
    const fresh = cache.get(cacheKey);
    if (fresh && fresh.expires > Date.now()) {
      res.set("Content-Type", fresh.contentType);
      return res.status(200).send(fresh.body);
    }
    return res.status(502).json({ error: "Failed to fetch upstream" });
  }

  const { allowed, retryAfter } = checkPerHostRateLimit(target.hostname);
  if (!allowed) {
    return res
      .status(429)
      .set("Retry-After", String(retryAfter))
      .json({ error: "Too many upstream requests for this host", retryAfter });
  }

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": `Lenemaradjak/1.0 WIP RSS Reader  (personal aggregator, contact: ${DEV_CONTACT ?? "n/a"})`,
          ...(cached?.lastModified
            ? { "If-Modified-Since": cached.lastModified }
            : {}),
          ...(cached?.etag ? { "If-None-Match": cached.etag } : {}),
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 304 && cached) {
      cached.expires = Date.now() + CACHE_TTL_MS;
      return {
        status: 200,
        contentType: cached.contentType,
        body: cached.body,
      };
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
    cache.set(cacheKey, {
      expires: Date.now() + CACHE_TTL_MS,
      contentType,
      body: buffer,
      lastModified: response.headers.get("last-modified") ?? null,
      etag: response.headers.get("etag") ?? null,
    });
    if (cache.size > 200) {
      const [first] = cache.keys();
      cache.delete(first);
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
    if (err.statusCode === 413) {
      return res.status(413).json({ error: RESPONSE_TOO_LARGE });
    }
    console.error("Upstream fetch failed:", err);
    return res.status(502).json({ error: "Failed to fetch upstream" });
  } finally {
    inflight.delete(cacheKey);
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Proxy server listening on http://127.0.0.1:${PORT}`);
});

export default app;
