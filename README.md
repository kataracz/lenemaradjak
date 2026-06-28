# Le ne maradjak

Dashboard for following Hungarian political news — live streams, videos,
podcasts, and articles from key independent publishers in one place.

**Live app:** https://lenemaradjak.web.app

## Publishers

- 444
- Telex
- Partizán
- Kontroll
- Magyar Hang
- 24.hu
- Válasz Online
- Direkt36
- Magyar Péter (official channels)

## Getting started

Node.js 24 is required (`node --version` should show `v24.x`).

```bash
npm install
cp example.env .env   # fill in values
npm run dev
```

## Environment variables

| Variable                   | Required   | Description                                                                                                         |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `VITE_YOUTUBE_API_KEY`     | Yes        | YouTube Data API v3 key                                                                                             |
| `ALLOWED_ORIGIN`           | Proxy only | Origin the proxy allows CORS requests from (default: `http://localhost:5173`)                                       |
| `DEV_CONTACT`              | Optional   | Contact address included in the `User-Agent` header sent to upstream RSS servers                                    |
| `UPSTASH_REDIS_REST_URL`   | Optional   | Upstash Redis REST URL — enables shared cache and rate limits across proxy instances instead of per-instance memory |
| `UPSTASH_REDIS_REST_TOKEN` | Optional   | Upstash Redis REST token, used together with `UPSTASH_REDIS_REST_URL`                                               |

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier (write)
npm run format:check # Prettier (check only)
npm test             # Vitest
npx tsc --noEmit     # Type-check without emitting
```

## Tech stack

React + TypeScript + Vite, shadcn + Tailwind for styling, react-grid-layout for
the widget layout. React Compiler is enabled.

## Development proxy

Some RSS feeds don't include CORS headers, so the app routes them through a
local proxy (`server/proxy-server.js`).

```bash
npm run dev:all      # Vite dev server + proxy container (recommended)
npm run start:server # Proxy with bare Node (no Docker)
```

The proxy listens on port 3001. If it's not running, some RSS feed requests will
fail in the browser.

**Security notes:**

- Bound to all interfaces (`0.0.0.0`) — not safe to expose directly to the
  internet
- CORS restricted to frontend origin via `ALLOWED_ORIGIN`
- `ALLOWED_HOSTS` allowlist in `server/proxy-server.js` (kept in sync with
  `src/lib/proxy-hosts.ts`) limits which upstream domains can be proxied
- Per-IP rate limiting (200 req/15 min) and per-host upstream limiting (15
  req/60 s)
- Responses larger than 5 MB are rejected; 10-second request timeout

## Production deployment

**Architecture:** Firebase Hosting serves the Vite SPA. Requests to `/api/**`
are rewritten to a Cloud Run service (`lenemaradjak-proxy`, `europe-west1`).
Upstash Redis provides shared cache and rate-limit state across instances.

**CI/CD:** On every push to `master`, two jobs run in parallel:

- `deploy-hosting`: builds the Vite app and deploys to Firebase Hosting
- `deploy-proxy`: builds a Docker image via Cloud Build and deploys to Cloud Run

On PRs and non-master pushes, CI runs lint, format check, tests, and a build.

Required GitHub secrets: `GCP_SA_KEY`, `FIREBASE_SERVICE_ACCOUNT`,
`VITE_YOUTUBE_API_KEY`, `DEV_CONTACT`.

**Manual deploy:**

```bash
# Proxy
gcloud builds submit \
  --tag europe-west1-docker.pkg.dev/lenemaradjak/lenemaradjak/proxy:latest
gcloud run deploy lenemaradjak-proxy \
  --image europe-west1-docker.pkg.dev/lenemaradjak/lenemaradjak/proxy:latest \
  --region europe-west1 --min-instances 0 --max-instances 2 \
  --allow-unauthenticated \
  --set-env-vars ALLOWED_ORIGIN=https://lenemaradjak.web.app,DEV_CONTACT=your@email.com \
  --set-secrets UPSTASH_REDIS_REST_URL=UPSTASH_REDIS_REST_URL:latest,UPSTASH_REDIS_REST_TOKEN=UPSTASH_REDIS_REST_TOKEN:latest

# Frontend
VITE_YOUTUBE_API_KEY=your_key npm run build
firebase deploy --only hosting
```

**Caching:** Shared Redis cache (TTL: 30 min for googleapis.com, 15 min for
others) keeps responses warm across Cloud Run scale-down cycles. Local dev falls
back to in-memory automatically when Redis env vars are absent.

**Key files:**

| Path                           | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `server/proxy-server.js`       | Proxy entrypoint                            |
| `server/cache-store.js`        | Dual memory/Redis cache                     |
| `server/rate-limiter.js`       | Dual memory/Redis rate limiter              |
| `server/redis-client.js`       | Upstash REST client                         |
| `src/lib/fetchers/rss.ts`      | Routes known hosts to `/api/proxy`          |
| `src/lib/proxy-hosts.ts`       | Shared host allowlist                       |
| `firebase.json`                | Firebase Hosting + Cloud Run rewrite config |
| `.github/workflows/deploy.yml` | CI/CD deploy workflow                       |
| `.github/workflows/ci.yml`     | CI lint/test/build workflow                 |

## Testing

```bash
npm test
```

Uses [Vitest](https://vitest.dev/) with jsdom. Coverage spans hooks, fetchers,
utilities, and widget components — see test files co-located with source files.
