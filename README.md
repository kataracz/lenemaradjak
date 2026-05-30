# Setup

This project uses React + TypeScript + Vite, shadcn + Tailwind for styling, and react-grid-layout for the dashboard's widget layout.

React Compiler is enabled.

# About

This is a simple, basic dashboard with widgets to make keeping up with Hungarian politics easier by collecting latest news and interviews by key independent publishers in one page.

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
- Telex (Direkt36 filter): https://telex.hu/rss/archivum?filters=%7B%22superTagSlugs%22%3A%5B%22direkt36%22%5D%2C%22parentId%22%3A%5B%22null%22%5D%7D&perPage=10
- Válasz Online: https://www.valaszonline.hu/feed/
- Magyar Hang: https://magyarhang.org/feed/
- 444: https://444.hu/feed/

### Podcasts

- Partizán podcast: https://media.rss.com/partizanpodcast/feed.xml
- Partizán podcast (alt): https://media.rss.com/partizan-podcast/feed.xml
- 444 podcast: https://www.omnycontent.com/d/playlist/d8df8f59-7dc7-4c59-be78-aea00114ae64/5643256c-50ca-4b83-bd76-aead00d561e1/31d0efea-4591-440a-8088-aead00d561fd/podcast.rss
- Telex podcast: https://anchor.fm/s/dcfcc3bc/podcast/rss

### Youtube

RSS feeds:

- Use direct YouTube channel RSS: `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`

Channels links:

- https://www.youtube.com/@Partiz%C3%A1nm%C3%A9dia
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

- get a general overview about latest happenings (view latest articles, podcasts, videos)
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

- YT lives (one widget per each live from publishers) with number of viewers. Order lives based on number of viewers, the most viewed live being the first one. Users should be able to watch lives on the dashboard, or to follow a link to youtube.
- One widget for the latest 5 videos from all publishers
- One widget for latest 5 podcasts from all publishers
- One widget for latest 5 articles from all publishers
- One widget for latest 5 youtube shorts from all publishers
- (?) One widget to show latest 5 lives from all publishers
- One widget to monitor Magyar Péter’s videos (youtube, youtube lives, youtube shorts)
- One widget to show 3 upcoming lives, alert if there are multiple lives coming up at the same time

# Naming conventions

The codebase uses the following naming conventions:

- Shared UI primitives and helper files: `kebab-case` file names.
- Page and widget component files: `PascalCase` file names.
- React components and hooks: `PascalCase` for component names, `camelCase` for hook names.
- Variables and functions: `camelCase` for local values and exported helpers.
- Constants and environment variables: `UPPER_SNAKE_CASE` for fixed values and `VITE_` prefixed env keys.

These conventions help keep filenames, component names, and variables consistent across the app.

# Linting

This project uses ESLint to enforce TypeScript and React patterns.

Run lint checks with:

```bash
npm run lint
```

Fix lint issues by updating offending code in `src/` or by adjusting config only when the issue is intentional or part of a third-party integration. If lint reports a rule violation in the UI components, focus first on the files you changed or the top-level widgets.

# Testing

This project includes a very small test suite powered by `vitest`.

Run the tests with:

```bash
npm test
```

The current test file verifies the shared `cn` utility in `src/lib/utils.ts`.
