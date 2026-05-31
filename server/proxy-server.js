import express from "express";
import rateLimit from "express-rate-limit";
import PROXY_HOSTS_LIST from "../src/lib/proxy-hosts.json" with { type: "json" };

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

const ALLOWED_HOSTS = new Set(PROXY_HOSTS_LIST);

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 2; // 2 minutes
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
const RESPONSE_TOO_LARGE = "Upstream response too large";

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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const conditionalHeaders = {};
    if (cached?.lastModified)
      conditionalHeaders["If-Modified-Since"] = cached.lastModified;
    if (cached?.etag) conditionalHeaders["If-None-Match"] = cached.etag;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Lenemaradjak/1.0 RSS Reader (personal aggregator)",
        ...conditionalHeaders,
      },
    });
    clearTimeout(timeout);

    if (response.status === 304 && cached) {
      cached.expires = Date.now() + CACHE_TTL_MS;
      res.set("Content-Type", cached.contentType);
      return res.status(200).send(cached.body);
    }

    const contentLength = Number(
      response.headers.get("content-length") ?? 0,
    );
    if (contentLength > MAX_BODY_BYTES) {
      return res.status(413).json({ error: RESPONSE_TOO_LARGE });
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();

    if (body.byteLength > MAX_BODY_BYTES) {
      return res.status(413).json({ error: RESPONSE_TOO_LARGE });
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

    res.set("Content-Type", contentType);
    return res.status(response.status).send(buffer);
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Upstream request timed out" });
    }
    console.error("Upstream fetch failed:", err);
    return res.status(502).json({ error: "Failed to fetch upstream" });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Proxy server listening on http://127.0.0.1:${PORT}`);
});

export default app;
