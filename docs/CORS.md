**CORS Proxy: Purpose, Security, and Legal Guidance**

Overview

- This repository includes a small server-side proxy at `server/proxy-server.js` used to fetch RSS/podcast/YouTube feed URLs that commonly block cross-origin browser requests. The proxy returns the upstream response to the client and sets CORS headers so the frontend can fetch feeds from the browser.

When is a proxy necessary?

- Browsers enforce Cross-Origin Resource Sharing (CORS). If an upstream feed does not include an `Access-Control-Allow-Origin` header allowing your origin, the browser will block the request. A server-side proxy performs the fetch from the server (not the browser), avoiding the browser-enforced CORS restriction.
- Use the proxy only when: direct feed URLs are blocked by CORS, the feed provider has no official client API, or server-side aggregation is required for caching/rate-limiting.

Security considerations

- Do not turn the proxy into an open proxy. Only allow requests to a small, explicit allowlist of hostnames (see `ALLOWED_HOSTS` in `server/proxy-server.js`).
- Add rate limiting and request timeouts (the included example uses `express-rate-limit` and an AbortController timeout).
- Use caching to reduce upstream load and improve performance; prefer a shared cache (Redis, CDN edge cache) in production, not an in-memory cache.
- Add logging and monitoring for abuse detection and troubleshooting.
- Limit payload sizes and validate responses where possible.
- Restrict which origins can use the proxy, if the service will be public-facing: prefer allowing only your app's origins rather than `*` for `Access-Control-Allow-Origin`.

Privacy and data handling

- The proxy will see the full URLs and responses you fetch. Do not proxy private or authenticated URLs through it unless you explicitly handle credentials and storage securely.
- Minimize retained data: keep only what is necessary in the cache and set appropriate TTLs.

Legal and terms-of-service (TOS) considerations

- I am not a lawyer. This is not legal advice. You should review the target site's terms of service and robots.txt before programmatically fetching or redistributing content.
- Some publishers explicitly forbid scraping or redistribution; others provide RSS or APIs with explicit usage terms — prefer the official RSS feed or API, and follow any attribution or licensing requirements.
- If a publisher offers an official API or commercial license, use that instead of scraping or proxying.

Operational recommendations for production

- Deploy the proxy as a serverless function (Cloud Functions, AWS Lambda, Vercel/Netlify function) or as a small service behind an API gateway.
- Use a CDN or edge cache (Cloudflare, Fastly, AWS CloudFront, Vercel Edge) to cache responses close to users.
- Add authentication or origin checks if the proxy must not be public.
- Harden network and platform security: TLS, firewall rules, automated alerts for error spikes, and request quotas.

How the client uses it (example)

- Production: the client fetches feeds via the proxy endpoint, for example:

  `/api/proxy?url=https://telex.hu/rss/mstag/belfold`

Implementation notes in this repo

- `server/proxy-server.js` — small Express proxy with allowlist, rate limiting, in-memory cache (2-minute TTL), and CORS headers.
- `src/lib/fetchers/rss.ts` — client logic routes requests for known CORS-blocking hosts to `/api/proxy?url=...` when running in the browser.

Next steps you should consider

- Replace the in-memory cache with a shared cache (Redis) or use a CDN for long-term production use.
- Lock down `Access-Control-Allow-Origin` to the specific origins your frontend uses.
- Add authentication for the proxy if you plan to expose it publicly.
- Document and keep a record of TOS/permission checks for each feed provider you use.

Questions or help

- I can: add a deployment example (serverless function or Docker + systemd), implement Redis caching, or add stricter origin handling. Which do you want next?
