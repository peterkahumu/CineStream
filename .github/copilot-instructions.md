# Copilot Instructions for CinemaPhora

## Build, type-check, and lint commands

### Main app (repository root)
- Install deps: `npm ci`
- Dev server: `npm run dev`
- Type-check: `npm run typecheck`
- Production build: `npm run build`
- Cloudflare deploy build chain: `npm run deploy` (runs app build + OpenNext build + Wrangler deploy)
- Lint: no `npm run lint` script is defined; use `npx eslint .` from repo root when needed

### Proxy worker (`proxy-worker/`)
- Dev server: `cd proxy-worker && npm run dev`
- Build: `cd proxy-worker && npm run build`
- Deploy: `cd proxy-worker && npm run deploy`

### Tests
- There is currently no automated test runner configured in this repository (`npm test`/test scripts are not defined).
- Single-test command: not available until a test framework is added.

## High-level architecture

- This is a **Next.js 16 App Router** app (TypeScript, CSS Modules) with optional Android wrapping via Capacitor and Cloudflare deployment via OpenNext.
- TMDB access is split by runtime:
  - Server components call `tmdbFetch()` directly.
  - Client-side fetches go through `app/api/tmdb/[...path]/route.ts`, which injects TMDB auth server-side and enforces safe-search certification cookies on discover endpoints.
- Homepage (`app/page.tsx`) orchestrates many independent TMDB requests with `Promise.allSettled` so one row failure does not break the page.
- Discovery-style pages (`/discover`, `/trending`, `/providers`, etc.) follow a shared pattern:
  - Server page fetches page 1 and passes initial data.
  - `components/DiscoveryFeed.tsx` handles infinite scroll and pagination on the client.
- Streaming playback is provider-driven:
  - Provider behavior is centralized in `lib/providers/index.ts` (ordered registry, URL builders, postMessage handlers).
  - Configured providers are resolved from env vars via `lib/streamingProvider.ts`.
  - `components/PlayerIframe.tsx` normalizes provider events into unified watch-progress storage (`lib/progressTracker.ts`).
- A separate Cloudflare worker in `proxy-worker/` can proxy/embed provider pages, strip ad/tracking elements, and enforce domain allowlisting.

## Key repository conventions

- Keep TMDB credentials server-only. Use `TMDB_API_KEY` and route browser traffic through `/api/tmdb/*` rather than exposing keys in client code.
- For new category/grid pages, reuse `DiscoveryFeed` + `FilterBar` patterns instead of creating custom infinite-scroll logic.
- Streaming providers must be added to the shared registry (`lib/providers/index.ts`) with:
  - env-key based URL config,
  - tier (`advanced` vs `basic`),
  - explicit trusted `origin` checks before accepting postMessage data.
- Progress data is merged conservatively:
  - Stored under `progress-{tmdbId}`.
  - Higher `watched` values win to avoid regressions when switching providers.
  - TV progress is keyed per episode (`s{season}e{episode}`).
- Terms acceptance is a cross-cutting gate:
  - Middleware enforces protected-route redirects using `cinemaphora_terms`.
  - UI state and cookie updates flow through `lib/terms.ts` (`TERMS_EVENT`) rather than ad-hoc cookie handling.
- User settings are cookie-backed with `cp_` prefix (`lib/settings.ts`) and mirrored to `<html data-*>` attributes; preserve this contract when adding new settings.
- Styling convention: CSS Modules per component plus global tokens in `app/globals.css`; do not introduce Tailwind unless explicitly requested.

## Existing project docs to use for context

- `README.md`: audience routing and project overview.
- `DEVELOPER.md`: primary architecture, environment variables, and deployment flow.
- `CONTRIBUTING.md`: issue template selection workflow.
