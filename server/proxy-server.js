import express from "express";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_HOSTS = new Set([
  "telex.hu",
  "www.telex.hu",
  "direkt36.hu",
  "www.direkt36.hu",
  "valaszonline.hu",
  "www.valaszonline.hu",
  "magyarhang.org",
  "www.magyarhang.org",
  "444.hu",
  "www.444.hu",
  "media.rss.com",
  "anchor.fm",
  "www.anchor.fm",
  "omnycontent.com",
  "www.omnycontent.com",
  "youtube.com",
  "www.youtube.com",
]);

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 2; // 2 minutes

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
  } catch (e) {
    return res.status(400).json({ error: "Invalid url" });
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
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();
    const buffer = Buffer.from(body);

    // Cache response
    cache.set(cacheKey, {
      expires: Date.now() + CACHE_TTL_MS,
      contentType,
      body: buffer,
    });

    res.set("Content-Type", contentType);
    return res.status(response.status).send(buffer);
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Upstream request timed out" });
    }
    return res
      .status(502)
      .json({ error: "Failed to fetch upstream", detail: String(err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});

export default app;
