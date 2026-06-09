# CLAUDE.md

## Project overview

React + TypeScript + Vite dashboard for following Hungarian political news. Uses
shadcn/Tailwind for UI and react-grid-layout for the widget layout.

See README.md for full project documentation including publishers, widget types,
and proxy server setup.

## Node

Node 24 is required. Use `PATH="/usr/local/bin:$PATH"` if the shell defaults to
an older version.

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

## After every change

1. Simplify any changed code where possible (remove duplication, dead branches,
   unnecessary abstractions, make sure to follow best practices and clean code
   principles)
2. Add or update tests if necessary.
3. Fix all TypeScript errors: `npx tsc --noEmit`
4. Fix all lint errors: `npm run lint`
5. Fix all build errors: `npm run build`
6. Run and pass all tests: `npm test`

## Conventions

- `kebab-case` for shared UI primitives and helper files
- `PascalCase` for page and widget component files
- `camelCase` for hooks, local values, and exported helpers
- `UPPER_SNAKE_CASE` for constants and `VITE_`-prefixed env keys

## Testing patterns

- Use stable array references at module scope in `renderHook` tests to prevent
  infinite effects
- Stub `VITE_YOUTUBE_API_KEY` to `''` for no-key tests
- Use URL-dispatch mocks (`mockImplementation((url) => ...)`) for parallel
  fetches across multiple publishers

## Architecture

- Widgets live in `src/components/dashboard/widgets/`
- Each widget uses either `useRSSFeed` (articles, podcasts) or `useYouTubeData`
  (videos, live streams)
- All widgets render inside `DashboardCard` from `widget-card.tsx` which
  provides the drag handle
- The floating YouTube player is driven by `VideoPlayerContext`
- Publisher config is in `src/lib/publisher-config.ts`
