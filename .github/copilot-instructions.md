# Copilot Instructions for CinemaPhora

## Build, type-check, test, and lint commands

### Main app (repository root)
- Install deps: `npm ci`
- Dev server: `npm run dev` (Next 16 + Turbopack)
- Type-check: `npm run typecheck`
- Tests: `npm test` — runs three `tsx` logic-verification scripts
  (`scripts/verify-next-episode.ts`, `verify-rails.ts`, `verify-stats.ts`). There is **no**
  test framework, so there is no single-test command; run the script directly with
  `npx tsx scripts/verify-stats.ts` to isolate one.
- Production build: `npm run build`
- Cloudflare deploy chain: `npm run deploy` (Next build → OpenNext build → `wrangler deploy`)
- Regenerate Worker binding types: `npm run cf-typegen` (required after cloning — the
  generated `worker-configuration.d.ts` is git-ignored and typecheck fails without it)
- DB schema push: `npm run db:push`
- Lint: no `npm run lint` script; use `npx eslint .`
- There is no `start` script. Serve a production build with
  `node .next/standalone/server.js`.

### Proxy worker (`proxy-worker/`)
Separate package, excluded from the root `tsconfig.json`. This package is currently dead code, and has been put there as a placeholder for future use. DO NOT EDIT/TOUCH IT.
- Dev: `cd proxy-worker && npm run dev`
- Build: `npm run build` · Deploy: `npm run deploy` · Logs: `npm run tail`

## High-level architecture

- **Next.js 16 App Router**, TypeScript, CSS Modules. Optional Android wrapping via
  Capacitor; primary deployment is Cloudflare Workers via OpenNext.
- **TMDB access is split by runtime.** Server components call `tmdbFetch()` in `lib/tmdb.ts`
  directly (1-hour revalidate). Client fetches go through `app/api/tmdb/[...path]/route.ts`,
  which injects auth server-side and enforces the safe-search certification cookie on
  discover endpoints. `instrumentation.ts` redacts TMDB URLs/keys from stdout/stderr.
- **Home page** (`app/page.tsx`) fans out ~20 TMDB requests with `Promise.allSettled` so one
  row's failure can't break the page.
- **Grid pages** (`/discover`, `/trending`, `/popular`, `/top-rated`, `/now-playing`,
  `/upcoming`, `/providers`) all share one pattern: server page fetches page 1,
  `components/DiscoveryFeed.tsx` handles infinite scroll, `components/FilterBar.tsx` drives
  filters through the URL, and the feed remounts on `key={JSON.stringify(searchParams)}`.
- **Playback is provider-driven.** `lib/providers/index.ts` is an ordered registry (URL
  builders, `postMessage` handlers, trusted origins); `lib/streamingProvider.ts` resolves
  which are configured from env; `components/PlayerIframe.tsx` normalises provider events
  into unified storage via `lib/progressTracker.ts`.
- **`proxy-worker/`** is a deployed Cloudflare Worker (currently dead code with plans to use it in the future) that proxies provider
  embeds, strips ads/trackers, blocks pop-unders and enforces domain allow-listing + SSRF
  protection. Wired in through `NEXT_PUBLIC_STREAM_PROXY_URL`; the player exposes a
  🛡️ Filter / ⚡ Direct toggle.
- **Database** is Supabase Postgres reached through **Cloudflare Hyperdrive**, always via
  `dbQuery()` in `lib/db/index.ts` — a fresh postgres.js client per call (`max: 1`), closed
  in `finally`, with retry/back-off on transient connection errors. Wrap multiple queries in
  one `dbQuery` call to share a connection.
- **Auth** is `next-auth` v5 with a Credentials provider and JWT sessions (`auth.ts`).
  Server actions in `app/actions/auth.ts` re-validate everything server-side.

## Key repository conventions

- Keep TMDB credentials server-only. Use `TMDB_API_KEY`; route browser traffic through
  `/api/tmdb/*`.
- Reuse `DiscoveryFeed` + `FilterBar` for new grid pages instead of writing custom
  infinite-scroll logic.
- NEVER TOUCH `proxy-worker/`, it's dead code for now.
- Re-use media cards from `components/media-card.tsx` and `components/media-list.tsx`. Don't reinvent the cards unless absolutely necessary. Alway build using a mobile first approach, that is, everything should be responsive.
- New streaming providers go in the shared registry with an env-key URL config, a tier
  (`advanced` vs `basic`), and an **explicit trusted `origin`** checked before accepting any
  `postMessage`.
- **Progress vs history are different things.** `watch_progress` is a mutable resume pointer
  (`progress-{tmdbId}` locally, higher `watched` wins, TV keyed per episode as `s{n}e{n}`).
  `watch_history` is the durable per-episode ledger that Profile stats are computed from —
  upserted by `episodeKey`, `watchedSeconds` merged with `GREATEST`/`Math.max`. Removing a
  title from Continue Watching is a **soft dismiss** (`dismissedAt`), never a delete.
- **Never guess `episode + 1`.** Next-episode resolution goes through
  `buildNextEpisodeKey()` in `lib/episodes.ts`, which returns `s{n}e{n}`, `CAUGHT_UP`,
  `SERIES_FINISHED` or `null`. `CAUGHT_UP` is a pending answer — re-resolve it, never cache
  it as a conclusion.
- **Sync is local-first and opt-in.** Every write path takes an `isAuthenticated` argument;
  guests never hit the sync endpoints. Debounce, then flush with chunked `sendBeacon`
  (48 KB chunks — the API silently drops payloads over ~64 KB).
- Terms acceptance is a cross-cutting gate: `middleware.ts` enforces it from the
  `cinemaphora_terms` cookie (crawlers pass through); UI state flows through `lib/terms.ts`
  and `TERMS_EVENT`, never ad-hoc cookie parsing.
- User settings are cookie-backed with a `cp_` prefix (`lib/settings.ts`) and mirrored to
  `<html data-*>`; preserve that contract when adding a setting.
- Styling: CSS Modules per component plus global tokens in `app/globals.css`. **No inline
  `style={{}}`, no Tailwind.**
- Timestamps stored as `Date.now()` must be `bigint`, not `integer` — Postgres `integer`
  overflows on epoch-ms.
- DB schema changes use `drizzle-kit push`. Never add `drizzle-kit generate` migration files.
- Pure logic in `lib/` (`episodes.ts`, `stats.ts`) must stay free of browser APIs and DB
  access, and should gain a `scripts/verify-*.ts` script.

## Existing project docs to use for context

- `README.md` — overview and audience routing.
- `USER.md` — every user-facing feature, in detail.
- `DEVELOPER.md` — architecture, env vars, schema, storage keys, deployment, gotchas.
- `coming_soon.md` — shipped-feature log and roadmap.
- `planning.md` — known gaps and open design decisions.
- `CONTRIBUTING.md` — branch/PR workflow and issue templates.
