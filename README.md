# Getting started

## Prerequisites

Node.js 24 is required (`node --version` should show `v24.x`).

## Install

```bash
npm install
```

## Environment variables

Copy the example file and fill in the values:

```bash
cp example.env .env
```

| Variable                   | Required                | Description                                                                                                                                                                                |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_YOUTUBE_API_KEY`     | YouTube Data API v3 key |
|                            |
| `ALLOWED_ORIGIN`           | Proxy only              | Origin the proxy allows CORS requests from (default: `http://localhost:5173`).                                                                                                             |
| `DEV_CONTACT`              | Optional                | Contact address included in the `User-Agent` header sent to upstream RSS servers.                                                                                                          |
| `UPSTASH_REDIS_REST_URL`   | Optional                | Upstash Redis REST URL. When set together with `UPSTASH_REDIS_REST_TOKEN`, the proxy shares its response cache and per-host rate limits via Redis instead of per-instance in-memory state. |
| `UPSTASH_REDIS_REST_TOKEN` | Optional                | Upstash Redis REST token, used together with `UPSTASH_REDIS_REST_URL`.                                                                                                                     |

# Setup

This project uses React + TypeScript + Vite, shadcn + Tailwind for styling, and
react-grid-layout for the dashboard's widget layout.

React Compiler is enabled.

# About

This is a simple, basic dashboard with widgets to make keeping up with Hungarian
politics easier by collecting latest news and interviews by key independent
publishers in one page.

The dashboard monitors:

- youtube lives
- youtube shorts
- youtube videos
- podcasts
- articles

# Publishers and new sources (RSS feeds and Youtube):

- 444
- Telex
- Partiizán
- Kontroll
- Magyar Hang
- 24.hu
- Válasz Online
- Direkt36
- Magyar Péter's official channels

## Links

### Articles

- Telex Belföld: https://telex.hu/rss/mstag/belfold
- Direkt36: https://www.direkt36.hu/feed/
- Telex (Direkt36 filter):
  https://telex.hu/rss/archivum?filters=%7B%22superTagSlugs%22%3A%5B%22direkt36%22%5D%2C%22parentId%22%3A%5B%22null%22%5D%7D&perPage=10
- Válasz Online: https://www.valaszonline.hu/feed/
- Magyar Hang: https://magyarhang.org/feed/
- 444: https://444.hu/feed/

### Podcasts

- Partizán podcast: https://media.rss.com/partizanpodcast/feed.xml
- Partizán podcast (alt): https://media.rss.com/partizan-podcast/feed.xml
- Telex podcast: https://anchor.fm/s/dcfcc3bc/podcast/rss

### Youtube

RSS feeds:

- Use direct YouTube channel RSS:
  `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`

Channels links:

- https://www.youtube.com/@Partizánmédia
- https://www.youtube.com/@kontrollhu
- https://www.youtube.com/@Telexponthu
- https://www.youtube.com/@magyarhang
- https://www.youtube.com/@magyarpeterofficial
- https://www.youtube.com/@negynegynegy
- https://www.youtube.com/@24ponthu
- https://www.youtube.com/@direkt3634
- https://www.youtube.com/@valaszonline

# MVP

Users can:

- get a general overview about latest happenings (view latest articles,
  podcasts, videos)
- filter by publisher or medium
- get general overview about current/upcoming lives
- choose which live to view embedded into the dashboard
- view youtube videos embedded into the dashboard
- open links to the original articles
- rearrange widgets

# Features in the pipeline for later implementation (using Firebase backend):

- register and sign in
- enable user to add widgets and dashboard tabs
- enable users to add other channels
- prioritize news sources, save favourites
- save dashboard layout
- push notifications

# Widget resize rules

- Max. 4 widgets in one row
- Always 1 widget per row on mobile
- Current lives are pinned to the top

# Widget types

- YT lives (one widget per each live from publishers) with number of viewers.
  Order lives based on number of viewers, the most viewed live being the first
  one. Users should be able to watch lives on the dashboard, or to follow a link
  to youtube.
- One widget for the latest 5 videos from all publishers
- One widget for latest 5 podcasts from all publishers
- One widget for latest 5 articles from all publishers
- One widget for latest 5 youtube shorts from all publishers
- (?) One widget to show latest 5 lives from all publishers
- One widget to monitor Magyar Péter’s videos (youtube, youtube lives, youtube
  shorts)
- One widget to show 3 upcoming lives, alert if there are multiple lives coming
  up at the same time

# Naming conventions

The codebase uses the following naming conventions:

- Shared UI primitives and helper files: `kebab-case` file names.
- Page and widget component files: `PascalCase` file names.
- React components and hooks: `PascalCase` for component names, `camelCase` for
  hook names.
- Variables and functions: `camelCase` for local values and exported helpers.
- Constants and environment variables: `UPPER_SNAKE_CASE` for fixed values and
  `VITE_` prefixed env keys.

These conventions help keep filenames, component names, and variables consistent
across the app.

# Formatting

This project uses [Prettier](https://prettier.io/) for code formatting. The
config is in [.prettierrc](.prettierrc).

Format all files:

```bash
npm run format
```

Check formatting without writing:

```bash
npm run format:check
```

ESLint is configured with `eslint-config-prettier` so its style rules don't
conflict with Prettier.

# Linting

This project uses ESLint to enforce TypeScript and React patterns.

Run lint checks with:

```bash
npm run lint
```

Fix lint issues by updating offending code in `src/` or by adjusting config only
when the issue is intentional or part of a third-party integration. If lint
reports a rule violation in the UI components, focus first on the files you
changed or the top-level widgets.

# Testing

This project uses [Vitest](https://vitest.dev/) with jsdom for unit and hook
tests.

Run the tests with:

```bash
npm test
```

Current coverage:

| File                                                                  | What is tested                                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/utils.test.ts`                                               | `cn()` class-name utility                                                                                                          |
| `src/lib/persistence.test.ts`                                         | `loadDashboardLayouts` / `saveDashboardLayouts` (localStorage round-trip, malformed JSON, quota errors)                            |
| `src/lib/publisher-config.test.ts`                                    | `publishers` array shape (unique IDs, required fields); `defaultPublisherIds` ordering                                             |
| `src/lib/youtube.test.ts`                                             | `extractYouTubeVideoId` (watch URLs, short URLs, edge cases); `buildYouTubeEmbedUrl` (domain, params, autoplay)                    |
| `src/lib/fetchers/rss.test.ts`                                        | RSS feed fetcher — XML parsing, proxy routing, cache hits, inflight dedup, HTTP errors                                             |
| `src/lib/fetchers/youtube.test.ts`                                    | `fetchYouTubeData` — response shaping, live vs video classification, caching, inflight dedup, partial errors, multi-publisher sort |
| `src/hooks/useCooldown.test.ts`                                       | Cooldown hook — initial state, trigger, double-trigger, expiry, unmount cleanup                                                    |
| `src/hooks/useDashboardPersistence.test.ts`                           | Dashboard layout persistence hook — empty storage, save/load round-trip, corrupted data                                            |
| `src/hooks/useRSSFeed.test.ts`                                        | RSS feed hook — initial state, multi-feed load/sort, full/partial errors, publisher filtering, cooldown                            |
| `src/hooks/useYouTubeData.test.ts`                                    | YouTube data hook — load, error, partial error, configured-channels guard, cooldown                                                |
| `src/hooks/useContainerWidth.test.ts`                                 | ResizeObserver-based width hook — threshold comparisons, custom threshold, observer cleanup                                        |
| `src/contexts/useVideoPlayer.test.tsx`                                | `VideoPlayerProvider` render; `useVideoPlayer` throws outside provider                                                             |
| `src/components/dashboard/feed-item-card.test.tsx`                    | `FeedItemCard` full and compact modes — link, description fallback, thumbnail play button, channel name                            |
| `src/components/dashboard/widget-registry.test.ts`                    | `dashboardWidgets` registry shape; `findWidgetDefinition` lookup and miss                                                          |
| `src/components/dashboard/widgets/ArticlesWidget.test.tsx`            | Loading/loaded/error/empty states; refresh button                                                                                  |
| `src/components/dashboard/widgets/LiveStreamsWidget.test.tsx`         | Loading/loaded/error/partial-error states; no-key and no-channel messages                                                          |
| `src/components/dashboard/widgets/PodcastsWidget.test.tsx`            | Loading/loaded/error/empty states; refresh button                                                                                  |
| `src/components/dashboard/widgets/VideoPlayerFloatingWidget.test.tsx` | Null state, YouTube embed URL, non-YouTube error, close button, resize                                                             |
| `src/components/dashboard/widgets/YoutubeVideosWidget.test.tsx`       | Loading/loaded/error/empty/partial-error states; play button triggers context                                                      |

# TypeScript

Run the type checker with:

```bash
npx tsc --noEmit
```

# Build

Compile and bundle for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

# Development proxy server

The app uses a local proxy for some RSS and remote feed hosts in development.
The proxy implementation is in `server/proxy-server.js`, and it avoids browser
CORS restrictions for the supported feed hosts.

When to use the proxy

- Use the proxy when a feed or upstream resource does not include
  `Access-Control-Allow-Origin` headers (browser will block direct fetches). The
  browser-based RSS fetcher routes known hosts to `/api/proxy`.

Run locally

Build the proxy image once (re-run after changes to `server/`):

```bash
npm run docker:build
```

Then start both the proxy container and the Vite dev server together:

```bash
npm run dev:all
```

Environment variables from `.env` are forwarded into the container
automatically. The proxy listens on port 3001, which matches the Vite dev
server's proxy target — no config change needed.

To run the proxy container on its own:

```bash
npm run docker:proxy
```

To run the proxy with bare Node instead of Docker (e.g. if Docker is not
available):

```bash
npm run start:server
```

If the proxy server is not running, some RSS feed requests may fail in the
browser.

Security & configuration

- The proxy binds to all interfaces (`0.0.0.0`) so it can run behind a reverse
  proxy or in a container. It is not safe to expose directly to the internet —
  access control relies on the `ALLOWED_HOSTS` allowlist, the `ALLOWED_ORIGIN`
  CORS restriction below, and your network/firewall configuration.
- CORS is restricted to the frontend origin via the `ALLOWED_ORIGIN` environment
  variable (default: `http://localhost:5173`). Set this in your `.env` file:
  ```
  ALLOWED_ORIGIN=http://localhost:5173
  ```
- The `ALLOWED_HOSTS` allowlist in `server/proxy-server.js` (kept in sync with
  `src/lib/proxy-hosts.ts`) restricts which upstream domains the proxy will
  fetch from. Keep this list small.
- Rate limiting (`express-rate-limit`, per IP, plus a per-host upstream limit)
  and a 10-second AbortController timeout are in place.
- Responses larger than 5 MB are rejected before buffering.
- The proxy sends conditional `If-Modified-Since` / `If-None-Match` headers when
  serving a stale-but-recently-cached response, reducing bandwidth when feeds
  haven't changed.
- The proxy identifies itself to upstream servers via a descriptive `User-Agent`
  header.
- The response cache and per-host rate limits are shared via Upstash Redis when
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are configured; otherwise
  each proxy instance keeps its own in-memory state.

Privacy, legal, and operational reminders

- The proxy will see full URLs and response content — do not proxy private or
  authenticated URLs unless you handle credentials securely.
- Review upstream sites' Terms of Service and `robots.txt` before scraping or
  redistributing content; prefer official RSS/APIs when available.
- All configured publishers use publicly available RSS feeds and the official
  YouTube API; no HTML scraping is performed.

Production deployment

Architecture: Firebase Hosting serves the Vite SPA (`dist/`). Requests to
`/api/**` are rewritten to a Cloud Run service (`lenemaradjak-proxy`,
`europe-west1`) via `firebase.json`. Cloud Run runs the Express proxy
(`server/proxy-server.js`) in Docker. Upstash Redis provides a shared cache and
rate-limit state across instances; without it each instance falls back to its own
in-memory state.

Prerequisites

- Firebase CLI: `npm i -g firebase-tools`
- GCP project `lenemaradjak` with Cloud Run, Artifact Registry, Cloud Build, and
  Secret Manager APIs enabled
- Upstash Redis database (upstash.com) — optional but recommended for production

Environment variables

| Variable                   | Where set                      | Purpose                          |
| -------------------------- | ------------------------------ | -------------------------------- |
| `VITE_YOUTUBE_API_KEY`     | GitHub secret / local `.env`   | YouTube Data API v3 key          |
| `ALLOWED_ORIGIN`           | Cloud Run env var              | CORS origin for the proxy        |
| `DEV_CONTACT`              | Cloud Run env var / GitHub secret | User-Agent contact header     |
| `UPSTASH_REDIS_REST_URL`   | Secret Manager → Cloud Run     | Redis endpoint                   |
| `UPSTASH_REDIS_REST_TOKEN` | Secret Manager → Cloud Run     | Redis auth token                 |

Deploying the proxy (manual)

```bash
gcloud builds submit \
  --tag europe-west1-docker.pkg.dev/lenemaradjak/lenemaradjak/proxy:latest
gcloud run deploy lenemaradjak-proxy \
  --image europe-west1-docker.pkg.dev/lenemaradjak/lenemaradjak/proxy:latest \
  --region europe-west1 --min-instances 0 --max-instances 2 \
  --allow-unauthenticated \
  --set-env-vars ALLOWED_ORIGIN=https://lenemaradjak.web.app,DEV_CONTACT=your@email.com \
  --set-secrets UPSTASH_REDIS_REST_URL=UPSTASH_REDIS_REST_URL:latest,UPSTASH_REDIS_REST_TOKEN=UPSTASH_REDIS_REST_TOKEN:latest
```

Deploying the frontend (manual)

```bash
VITE_YOUTUBE_API_KEY=your_key npm run build
firebase deploy --only hosting
```

CI/CD

On every push to `master`, two jobs run in parallel:

- `deploy-hosting` (`.github/workflows/deploy.yml`): builds the Vite app with
  `VITE_YOUTUBE_API_KEY` and deploys to Firebase Hosting via
  `FirebaseExtended/action-hosting-deploy`.
- `deploy-proxy` (`.github/workflows/deploy.yml`): authenticates with GCP,
  builds a new Docker image via Cloud Build (tagged with the git SHA), and
  deploys it to Cloud Run.

On PRs and non-master pushes, `.github/workflows/ci.yml` runs lint, format
check, tests, and a build.

Required GitHub repo secrets: `GCP_SA_KEY`, `FIREBASE_SERVICE_ACCOUNT`,
`VITE_YOUTUBE_API_KEY`, `DEV_CONTACT`.

Caching strategy

- Shared Redis cache (TTL: 30 min for googleapis.com, 15 min for others) means
  cold-start Cloud Run instances don't hammer publishers.
- Per-IP rate limiting (200 req/15 min) and per-host upstream limiting
  (15 req/60 s) prevent overload.
- At `min-instances=0`, the shared Redis cache keeps responses warm even after
  container scale-down.
- Local dev: omit Redis env vars → in-memory fallback is active automatically.

Implementation notes (repo locations)

- Proxy entrypoint: `server/proxy-server.js`
- Dual memory/Redis cache: `server/cache-store.js`
- Dual memory/Redis rate limiter: `server/rate-limiter.js`
- Upstash REST client: `server/redis-client.js`
- Docker image: `Dockerfile` (root), `.dockerignore`
- Firebase config: `firebase.json`
- CI workflow: `.github/workflows/ci.yml`
- Deploy workflow: `.github/workflows/deploy.yml`
- Client-side routing for feeds: `src/lib/fetchers/rss.ts` (routes known hosts
  to `/api/proxy`).
- Shared host allowlist: `src/lib/proxy-hosts.ts` (imported by `rss.ts`;
  manually kept in sync with `server/proxy-server.js`).
