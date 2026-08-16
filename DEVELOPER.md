# 💻 CinemaPhora — Developer Guide

Architecture, tech stack, conventions, and everything you need to run, extend and deploy
the application.

## Table of Contents
- [Tech Stack](#-tech-stack)
- [Getting Started](#️-getting-started)
  - [Prerequisites](#1-prerequisites)
  - [Environment Variables](#2-environment-variables)
  - [Database Setup](#3-database-setup)
  - [Run It](#4-run-it)
- [npm Scripts](#-npm-scripts)
- [Architecture & Core Concepts](#️-architecture--core-concepts)
  - [Secure TMDB Proxy Layer](#secure-tmdb-proxy-layer)
  - [Rendering & Caching Strategy](#rendering--caching-strategy)
  - [Database Access (Supabase via Hyperdrive)](#database-access-supabase-via-hyperdrive)
  - [Auth](#auth)
  - [Local-First Sync](#local-first-sync)
  - [Watch Progress vs. Watch History](#watch-progress-vs-watch-history)
  - [Episode Resolution & the Two Personal Rails](#episode-resolution--the-two-personal-rails)
  - [Profile Stats](#profile-stats)
  - [Settings](#settings)
  - [Terms Gate & Middleware](#terms-gate--middleware)
  - [Streaming Providers](#streaming-providers)
  - [Ad-Filtering Proxy Worker](#ad-filtering-proxy-worker)
  - [Infinite Scroll Pattern](#infinite-scroll-pattern)
  - [PWA & Offline](#pwa--offline)
  - [Capacitor (Android)](#capacitor-android)
- [Route Map](#-route-map)
- [API Route Reference](#-api-route-reference)
- [Database Schema](#-database-schema)
- [Client Storage Keys](#-client-storage-keys)
- [Folder Structure](#-folder-structure)
- [Code Quality Rules](#-code-quality-rules)
- [Styling Guidelines](#-styling-guidelines)
- [Testing](#-testing)
- [CI](#-ci)
- [Deployment](#-deployment)
- [Adding Things](#-adding-things)
- [Gotchas](#-gotchas)
- [Key TMDB Provider IDs](#-key-tmdb-provider-ids)
- [Contributing & Issues](#-contributing--issues)

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React 19) |
| Language | TypeScript (strict) |
| Styling | CSS Modules + global CSS variables (**no Tailwind**) |
| Auth | [`next-auth` v5 beta](https://authjs.dev/) — Credentials provider, JWT sessions |
| Database | Supabase Postgres, reached through **Cloudflare Hyperdrive** |
| ORM | [Drizzle](https://orm.drizzle.team/) (`drizzle-orm` + `drizzle-kit push`) |
| Metadata / Discovery | [TMDB API v3 & v4](https://www.themoviedb.org/) |
| Video Embeds | Provider registry in `lib/providers/` + `lib/streamingProvider.ts` |
| Ad filtering | Standalone Cloudflare Worker in `proxy-worker/` |
| PWA | `@ducanh2912/next-pwa` with custom Workbox runtime caching |
| Native (Android) | [Capacitor](https://capacitorjs.com/) 8 |
| Toasts | `react-hot-toast` |
| Primary Deployment | [Cloudflare Workers](https://workers.cloudflare.com/) via `@opennextjs/cloudflare` |
| Alternate Deployment | Docker (Next.js `output: "standalone"`) |

---

## ⚙️ Getting Started

### 1. Prerequisites

- **Node.js 22+** (Wrangler requires ≥ 22; CI pins 22), or **Docker + Docker Compose**.
- A **TMDB API key** — a v4 Read Access Token is strongly preferred over a v3 key.
- A **Postgres database** (Supabase is what the deployed app uses) if you want accounts.

Accounts are optional to develop against: the app is fully usable as a guest, and every
DB-backed feature degrades to localStorage when no session exists.

### 2. Environment Variables

Two files, because the app can run under plain Node *or* the Cloudflare Workers runtime:

**`.env.local`** (copy from `.env.example`) — read by `next dev`, `next build`, and
`drizzle-kit`:

```env
# TMDB — a v4 Read Access Token (long JWT) is sent as a Bearer header;
# a 32-char v3 key is appended as ?api_key= instead. Both work, v4 is safer.
TMDB_API_KEY=your_v4_read_access_token_here

# Used by `npm run db:push` and as the local fallback in lib/db/index.ts.
# Use Supabase's *Supavisor pooler* string — the direct host is IPv6-only and
# many local/CI networks can't reach it.
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require

# Streaming provider base URLs — configure only the servers you want active.
# Order in lib/providers/index.ts decides priority; unset vars are skipped.
NEXT_PUBLIC_VIDAPI_URL=
NEXT_PUBLIC_CINESRC_URL=
NEXT_PUBLIC_VIDLINK_URL=
NEXT_PUBLIC_VIDNEST_URL=
NEXT_PUBLIC_VIDFAST_URL=
NEXT_PUBLIC_EMBEDMASTER_URL=
NEXT_PUBLIC_PRIMESRC_URL=
NEXT_PUBLIC_MULTIEMBED_URL=
NEXT_PUBLIC_MOVIESAPI_URL=

# Optional — base URL of the deployed proxy-worker. When set, every embed is
# routed through it and the player gains a 🛡️ Filter / ⚡ Direct toggle.
NEXT_PUBLIC_STREAM_PROXY_URL=
```

**`.dev.vars`** (copy from `.dev.vars.example`) — read by the Workers runtime
(`wrangler dev`, and by `next dev` through `initOpenNextCloudflareForDev()`):

```env
AUTH_SECRET=            # generate with `npx auth secret`
AUTH_TRUST_HOST=true
# Bypasses the Hyperdrive binding during local dev.
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://...
```

> Both files are git-ignored. The TMDB key is **never** exposed to the browser — see
> [Secure TMDB Proxy Layer](#secure-tmdb-proxy-layer).

### 3. Database Setup

```bash
npm run db:push
```

This project uses **`drizzle-kit push` (schema diffing), not migration files**. There is no
`lib/db/migrations` folder to run — re-run `db:push` any time `lib/db/schema.ts` changes.

### 4. Run It

**Node:**
```bash
npm install
npm run dev          # http://localhost:3000, Turbopack
```

**Docker (hot-reloading dev container):**
```bash
docker compose up cinemaphora-development --build
```
The container sets `WATCHPACK_POLL=true` so file watching works across host volumes.

> The PWA service worker is **disabled in development** (`next.config.ts`). To exercise
> PWA/offline behaviour, build for production and serve the standalone output (or use the
> production Docker target).

---

## 📦 npm Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next dev server with Turbopack |
| `npm run build` | Production Next build (webpack, `output: "standalone"`) |
| `npm run build:worker` | OpenNext → Cloudflare Worker bundle into `.open-next/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Runs the three `scripts/verify-*.ts` logic checks (see [Testing](#-testing)) |
| `npm run db:push` | Push `lib/db/schema.ts` to Postgres via drizzle-kit |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `npm run deploy` | `build` → `build:worker` → `wrangler deploy` |

There is no `lint` script — run `npx eslint .`. There is no `start` script; to serve a
production build locally, run `node .next/standalone/server.js` after `npm run build`, or
use the production Docker target.

---

## 🏗️ Architecture & Core Concepts

### Secure TMDB Proxy Layer

**The TMDB API key never reaches the client.**

- **Server Components** call `tmdbFetch()` in `lib/tmdb.ts` directly. It detects
  `typeof window === 'undefined'` and hits `api.themoviedb.org` itself, choosing between a
  v4 `Authorization: Bearer` header (key length > 100) and a v3 `?api_key=` query param.
- **Client Components** hit `/api/tmdb/[...path]`, a Route Handler that forwards the path
  and query string to TMDB with the key injected server-side.
- 401s and any error mentioning an API key are caught and rethrown as a generic
  "service currently unavailable" so nothing leaks to the UI.
- `instrumentation.ts` adds defence in depth: it patches `process.stdout`/`stderr` to redact
  `api.themoviedb.org` URLs and `api_key=` params from anything Next.js logs.

The proxy also enforces the **age-rating ceiling** — if the `cp_maxCertification` cookie is
set and the request targets `discover/movie` or `discover/tv`, it appends
`certification_country=US` and `certification.lte`. Server components apply the same rule by
reading the cookie directly (`app/page.tsx`, `app/discover/page.tsx`).

### Rendering & Caching Strategy

- `tmdbFetch` server-side requests use `next: { revalidate: 3600 }` — one hour.
- The `/api/tmdb` proxy caches for 5 minutes server-side and sends
  `Cache-Control: public, max-age=120, stale-while-revalidate=300` to the browser.
- Page-level: home `revalidate = 300`; details and providers `revalidate = 3600`; watch,
  discover, `/api/get-stats` and `/api/upcoming-episodes` are `force-dynamic`.
- The **home page** fans out ~20 TMDB calls through a single `Promise.allSettled`, with an
  `ok()` helper that returns `[]` for rejected results. A failing row renders nothing; it
  can never take the page down.

### Database Access (Supabase via Hyperdrive)

All DB access goes through `dbQuery()` in `lib/db/index.ts`. Two things make it unusual:

1. **Hyperdrive.** Workers can't do a raw TLS handshake to an arbitrary Postgres host — the
   `nodejs_compat` `tls` polyfill doesn't implement `rejectUnauthorized`, so postgres.js
   throws `ERR_OPTION_NOT_IMPLEMENTED`. Cloudflare Hyperdrive proxies and pools the real
   connection and hands the Worker a safe connection string via
   `getCloudflareContext().env.HYPERDRIVE.connectionString`. Outside Workers it falls back
   to `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`, then `DATABASE_URL`.
2. **A fresh client per call, closed in `finally`.** A socket opened in one request's
   execution context can't be reused by another in the same isolate — it doesn't error, it
   *hangs* until the runtime kills the request. `max: 1` per call; Hyperdrive does the real
   pooling.

`dbQuery` retries up to 3 times with exponential back-off (300 ms → 600 ms → 900 ms) on
transient connection errors only (`CONNECTION_ENDED`, `CONNECT_TIMEOUT`, `ECONNRESET`, …),
never on SQL logic errors.

> **Wrap multiple queries in one `dbQuery` call** (e.g. a loop over items to sync) so they
> share a connection instead of opening one each.

### Auth

`auth.ts` configures `next-auth` v5 with a single **Credentials** provider and **JWT**
sessions (no adapter tables for sessions). `authorize()` looks the user up by email and
compares with `bcryptjs`. The `jwt`/`session` callbacks carry `user.id` through as
`session.user.id`, which every protected route handler reads.

Server actions live in `app/actions/auth.ts`: `registerUser`, `checkEmailExists`,
`updateDisplayName`, `changePassword`, `deleteAccount`. All of them re-validate server-side
— the client forms' `type="email"` / `minLength` are convenience, not the gate. Account
deletion re-verifies the password, then deletes the `user` row; every other table cascades
via `onDelete: "cascade"`.

### Local-First Sync

Four things sync, all following the same pattern:

| What | Local store | DB table | Routes |
|---|---|---|---|
| Watch progress (resume pointer) | `progress-{tmdbId}` in localStorage | `watch_progress` | `GET /api/get-progress`, `POST`/`DELETE /api/sync-progress` |
| Watch history (the durable ledger) | `cinemaphora-history-events` | `watch_history` | `GET /api/get-history`, `POST /api/sync-history` |
| My List / wishlist | `cinemaphora-wishlist` | `watchlist` | `GET /api/get-watchlist`, `POST`/`DELETE /api/sync-watchlist` |
| Settings | `cp_*` cookies | `user_settings` | `GET /api/get-settings`, `POST /api/sync-settings` |

The rules, in one place:

- **Writes hit local storage immediately** — no latency, works offline and logged out.
- **DB sync is opt-in per call** via an `isAuthenticated` argument. Callers read it from
  `useSession()`, because the session cookie is `httpOnly` and a plain module can't sniff
  it. **Guests never touch the sync endpoints** — zero wasted requests.
- **Debounced batching** — progress and history debounce 10 s, settings 3 s, wishlist 10 s.
  Rapid edits cost one round trip, not one per click.
- **Conflict resolution is latest-`updatedAt`-wins** for progress, wishlist and settings.
  History is merged by *episode identity* with `watchedSeconds` taking the **max** on both
  sides (the server upsert uses `GREATEST`), so monotonic furthest-position semantics hold
  and two devices can never talk each other's watch time down.
- **Tombstones.** Deletions write a tombstone (`cinemaphora-deleted-progress`,
  `cinemaphora-deleted-watchlist`, 30-day TTL) so a stale server row can't resurrect
  something you deleted. If the remote row is *newer* than the tombstone, the user re-added
  it elsewhere and the tombstone is cleared.
- **`SyncManager`** (mounted in the root layout) polls `/api/get-progress` and
  `/api/get-watchlist` every 30 s while the tab is visible, merges the results, and flushes
  everything on `visibilitychange → hidden` and `beforeunload` via `navigator.sendBeacon`.
- **Beacon chunking.** `sendBeacon` silently rejects payloads over ~64 KB (it just returns
  `false`). `sendInChunks()` splits flushes at 48 KB, and history flushes only send rows
  marked dirty since the last successful sync.
- **Active-playback guard.** `setActivePlayback(id)` marks the title currently open in the
  player; `mergeRemoteProgress` skips it entirely. Timestamps can't referee two devices
  actively playing the same title, so a background poll simply isn't allowed to try.
- **On login/register**, `lib/authSync.ts` pulls progress + history + wishlist, merges them
  into localStorage, then pushes anything local-only (watched as a guest before signing in).

### Watch Progress vs. Watch History

These are deliberately separate and it matters:

- **`watch_progress`** is a *mutable resume pointer*, one row per title. It's what Continue
  Watching reads. It holds `watched`/`duration`, per-episode `show_progress`, the resolved
  `nextEpisodeKey`, and `dismissedAt`.
- **`watch_history`** is the *durable ledger*, one row per episode/movie keyed by
  `episodeKey` = `${mediaType}-${tmdbId}-${season ?? 'x'}-${episode ?? 'x'}`. It carries its
  own `watchedSeconds`/`runtimeSeconds`, and an `event` of `started` | `completed`.

Rows are **upserted, not appended** — resuming or rewatching the same episode updates its
row rather than piling up duplicates. `occurredAt` only moves when the event *state* changes
(so a resume months later doesn't drag the entry forward on the activity timeline);
`updatedAt` moves on any change, including seconds-only ones.

Thresholds in `lib/progressTracker.ts`: `started` at **30 s** watched, `completed` at
**≥ 90 %**. Each fires once per movie, or once per episode for TV.

**Removal is a soft dismiss.** The Continue Watching × calls `dismissProgress()`, which sets
`dismissedAt` and keeps the row. `removeProgress()` (a genuine purge, with a tombstone and a
server DELETE) exists but isn't what the UI button does — hard-deleting would erase hours
the user actually watched from their stats.

`backfillHistorySeconds()` runs once per session from `SyncManager`, lifting watch seconds
out of old `show_progress` maps into history rows for anything watched before history
carried them. It writes localStorage once for the whole pass and marks rows dirty rather
than syncing directly.

### Episode Resolution & the Two Personal Rails

`lib/episodes.ts` is pure and browser-free so the client tracker and server routes give
identical answers. `buildNextEpisodeKey(info, season, episode)` returns:

| Value | Meaning |
|---|---|
| `s{n}e{n}` | A real, already-aired episode to continue with |
| `CAUGHT_UP` (`'wait'`) | Up to date, but more is coming — a *pending* answer; always re-resolve, never trust the cached one |
| `SERIES_FINISHED` (`'end'`) | That was the last episode there will ever be |
| `null` | TMDB doesn't describe this season; we can't say |

It never guesses `episode + 1` and never advances past `last_episode_to_air` —
`seasons[].episode_count` includes *unaired* episodes, so trusting it mid-season sends
viewers to an episode no server can play.

That drives a strict hand-off between two rails, and **a title is in exactly one of them**:

- **`ContinueWatchingRow`** — things you can press play on now. Reads stored progress.
  Advances the card on episode completion, retires it on a movie/finale, and hands the title
  off when it hits `CAUGHT_UP`. Unresolved keys trigger a background
  `/api/tmdb/tv/{id}` lookup, and `setNextEpisodeKey` fires `PROGRESS_SYNC_EVENT` to re-render.
- **`UpcomingEpisodesRow`** — reads *watch history* (not progress), so a show returns on its
  own merits even without a progress row. It posts its candidate list to
  `/api/upcoming-episodes`, which fans out TMDB lookups and classifies each show as
  `available` (aired, unwatched, within 5 episodes) or `upcoming` (next episode dated within
  120 days).

`scripts/verify-rails.ts` pins the two rule sets against each other so a show can't land in
both or fall through the gap.

### Profile Stats

`lib/stats.ts` exports `computeStats({ historyRows, progressRows, now })` — **pure and
side-effect free**, so it can be exercised without a database. `/api/get-stats` only fetches
rows and hands them over.

It merges both tables per *episode identity*, taking the larger `watchedSeconds` where they
overlap. History is the primary source (it survives a Continue Watching removal); progress
is merged in to cover anything watched before history carried seconds. Nothing is
double-counted and the two sources heal towards each other.

Output includes titles/movies/TV counts, total and per-media watch seconds, completion rate,
active streak, a 90-day activity series, top 5 titles, binge metrics, and genre tallies
bucketed by 7d / 30d / MTD / 90d / all.

### Settings

`lib/settings.ts` owns the `UserSettings` shape and its cookie storage. Every key is a
`cp_`-prefixed cookie, plus `cp_updatedAt` recording when this device last changed anything.
`applySettingsToDOM()` mirrors theme, reduce-motion, data-saver and layout onto
`<html data-*>` attributes.

`components/SettingsProvider.tsx` is the React context. On mount it reads cookies, applies
them, and auto-detects region from the shared geo cache (or `countries.dev/ip`) when
`cp_region` isn't set. Once `useSession()` reports `authenticated`, it reconciles with the
DB: remote wins if `remote.updatedAt > localUpdatedAt`, otherwise this device pushes up.

To avoid a flash of the wrong theme, `app/layout.tsx` injects a `beforeInteractive`
`next/script` that reads `cp_theme`, `cp_reduceMotion`, `cp_dataSaver` and `cp_defaultLayout`
straight from `document.cookie` and stamps `<html>` before first paint.

### Terms Gate & Middleware

`middleware.ts` enforces terms acceptance **server-side**, before any protected HTML is
rendered:

- Public routes: `/`, `/terms`, `/privacy`, `/declined`, `/~offline`.
- Public prefixes: `/_next/`, `/api/`, `/favicon`, `/sw.js`, `/manifest`, `/icons/`.
- **Crawlers pass through** (`googlebot|bingbot|duckduckbot|facebookexternalhit|twitterbot|linkedinbot`)
  so SEO isn't damaged.
- Anyone else without `cinemaphora_terms=true` is redirected to
  `/declined?redirect=<original-path+query>`; accepting sends them exactly where they were
  headed.

All cookie reads/writes go through `lib/terms.ts`, which also dispatches a `TERMS_EVENT`
window event so `TermsAgreementModal` and the settings page stay in sync. The cookie is
written with a far-future expiry for **both** `true` and `false` — Capacitor WebViews ignore
a `max-age=0` delete, so revocation has to be an explicit `false`, not a removal.

### Streaming Providers

`lib/providers/index.ts` is an **ordered registry**; `lib/streamingProvider.ts` filters it to
the providers whose env var is set and returns them in priority order. Providers ship in two
tiers:

- **`advanced`** — emits `postMessage` events, so progress tracking, cross-device resume and
  next-episode detection work: **VidAPI, CineSRC, VidLink, VidNest, VidFast, EmbedMaster**.
- **`basic`** — plain iframe embeds, URL params only, no tracking: **PrimeSrc, Multiembed,
  MoviesAPI**.

`components/PlayerIframe.tsx` orchestrates them:

- Validates `event.origin` against the provider's declared `origin` (string or array —
  VidFast sends from any of nine domains) **and** checks `event.source` matches the current
  iframe, so a stale iframe's buffered events are ignored.
- Normalises every provider's `show_progress` into our `EpisodeProgress` shape, always
  rebuilding keys as `s{n}e{n}` (providers have sent `S1E2` and other spellings, and a key
  that doesn't match what `getResumeTime` looks up is the same as no progress at all).
- Always writes an entry for the episode actually playing, even when the provider sends no
  map at all.
- Resolves the resume position on mount: localStorage first; for signed-in users with no
  local row (new device, cleared storage, private window), the server's copy is *read* (not
  merged — the title is already walled off by `setActivePlayback`).
- Guards `onNextEpisode` to fire once per episode; `WatchClient` then overrides whatever the
  provider asked for with our own TMDB-derived answer, because players routinely fire "next"
  as current + 1.

Three shared shapes live in `lib/providers/types.ts`: `ProviderConfig`, `PlayerCallbacks`,
`PlayerContext`.

### Ad-Filtering Proxy Worker

`proxy-worker/` is a **separate, deployed Cloudflare Worker** (its own `package.json` and
Wrangler config; excluded from the root `tsconfig.json`). It is wired in via
`NEXT_PUBLIC_STREAM_PROXY_URL` — when set, `WatchClient` rewrites every embed URL to
`${PROXY_BASE}/?url=<encoded>` and surfaces a **🛡️ Filter / ⚡ Direct** toggle so a user can
bypass it per-server.

What it does:
- **`blocklist.ts`** — a large static ad/tracker domain list, extensible at runtime from a
  KV namespace (`BLOCKLIST`, key `domains`) without redeploying. Matched as substrings of
  `script`/`iframe`/`img`/`link` src attributes.
- **`adCss.ts`** — CSS injected into every proxied page, hiding ad containers that get
  inserted dynamically after render.
- **`locationSpoof.ts`** — an IIFE prepended to `<head>` that neutralises pop-unders
  (`window.open` to foreign origins returns `null`), suppresses `alert`/`confirm`, and
  proxies `window.location` so provider scripts see their own origin. `prompt` is
  deliberately left alone — some players use it for PIN entry.
- **SSRF hardening** — rejects non-http(s) protocols, private/loopback/link-local addresses
  (including `169.254.169.254`), and anything outside `ALLOWED_DOMAINS`. Redirects are
  followed **manually** (max 5 hops) so an allowlisted origin can't 302 the fetch past those
  checks into an internal target.

```bash
cd proxy-worker
npm run dev      # local
npm run deploy   # ship it
npm run tail     # live logs
```

### Infinite Scroll Pattern

Every grid page (`/trending`, `/popular`, `/top-rated`, `/now-playing`, `/upcoming`,
`/providers`, `/discover`) is the same three pieces:

1. A **server component** fetches page 1 and passes `initialItems` (plus, for `media=all`,
   separate movie and TV sets with their own page counts).
2. **`components/DiscoveryFeed.tsx`** loads every subsequent page client-side via
   `IntersectionObserver`.
3. **`components/FilterBar.tsx`** drives filters through the URL, and pages remount on
   filter change via `key={JSON.stringify(searchParams)}` — no `useEffect` state sync.

The sentinel `<div>` is **unmounted** while loading and once all pages are exhausted,
preventing duplicate callbacks and "footer flash".

### PWA & Offline

`@ducanh2912/next-pwa` wraps the Next config, disabled in development. Runtime caching:
TMDB images are `CacheFirst` (200 entries / 30 days); `/_vercel/*` and Cloudflare Insights
are `NetworkOnly`. The document fallback is `/~offline`.

`hooks/useOnlineStatus.ts` tracks connectivity reactively (SSR-safe: starts `true`, corrects
on first client render), and `OfflineTrailerWrapper` uses it to swap iframes for a friendly
message when offline.

> `components/MobileNav.tsx` deliberately uses plain `<a>` tags rather than `next/link`:
> `<Link>` does a client-side RSC fetch first, which fails offline. A native anchor lets the
> service worker serve the cached document.

### Capacitor (Android)

`components/CapacitorInit.tsx` handles the native shell:
- Hides the splash screen and configures the status bar on boot.
- Maps the hardware **back button** to `router.back()`, exiting the app at `/`.
- On `fullscreenchange`, locks to landscape and hides the status bar (with a 2.5 s
  re-assert interval, because Android likes to bring it back), restoring on exit.
- Falls back to the non-standard `screen.orientation.lock()` on the web.

`capacitor.config.ts` points `server.url` at the live site, so the Android app is a native
shell around the deployed web app. The `.github/workflows/android-build.yml` workflow builds
a debug APK on pushes to `feat/android-**` branches or on manual dispatch.

---

## 🗺️ Route Map

| Route | Purpose |
|---|---|
| `/` | Home — server-rendered rows, `revalidate = 300` |
| `/trending` | Global trending grid |
| `/popular` | Popular movies & TV |
| `/top-rated` | Highest rated |
| `/now-playing` | In theatres / currently on air |
| `/upcoming` | Releasing in the next 3 months |
| `/providers` | Streaming provider hub (Netflix, Prime, Disney+, Apple TV+, Hulu, Peacock) |
| `/discover` | Generic filtered grid — genre, country, language, year, rating, providers, date ranges |
| `/search` | Multi-search with infinite scroll |
| `/details/[id]` | Movie / TV detail page (`?type=movie\|tv`, `?tab=watch\|trailers\|cast\|reviews\|where`) |
| `/watch/[id]` | Embedded player (`?type=`, `?s=`, `?e=`) |
| `/person/[id]` | Actor / crew filmography |
| `/wishlist` | My List — tabs, folders, search, sort |
| `/profile` | Stats · Watch History · Account Management (auth required) |
| `/settings` | Preferences — open to guests |
| `/login`, `/register` | Auth pages |
| `/terms`, `/privacy` | Legal |
| `/declined` | Terms-declined gate, honours `?redirect=` |
| `/~offline` | PWA offline fallback |

---

## 🔌 API Route Reference

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/tmdb/[...path]` | GET | — | Secure TMDB proxy; injects the key, applies the age-rating ceiling on discover endpoints |
| `/api/countries` | GET | — | Country/language list from `countries.dev`, cached 24 h |
| `/api/upcoming-episodes` | POST | — | Takes the caller's furthest-watched episode per show and returns `available`/`upcoming` cards. Stateless, so guests and signed-in users take the same path |
| `/api/get-progress` | GET | ✅ | All progress rows, mapped to the local `WatchProgress` shape |
| `/api/sync-progress` | POST / DELETE | ✅ | Batch upsert (deduped by `tmdbId`, latest-`updatedAt`-wins) / purge one title |
| `/api/get-history` | GET | ✅ | Raw list for login reconciliation; with `?page=` it collapses and paginates for the Profile list. Also accepts `?type=movie\|tv`, `?pageSize=` (max 50) |
| `/api/sync-history` | POST | ✅ | Upsert by `(userId, episodeKey)`; `watchedSeconds`/`runtimeSeconds` merged with `GREATEST` |
| `/api/get-watchlist` | GET | ✅ | Mapped to the local `WishlistItem` shape |
| `/api/sync-watchlist` | POST / DELETE | ✅ | Batch upsert keyed on `(userId, tmdbId, mediaType)` / remove one item |
| `/api/get-settings` | GET | ✅ | `{ settings, updatedAt }` or `null` |
| `/api/sync-settings` | POST | ✅ | Latest-`updatedAt`-wins upsert of the whole blob |
| `/api/get-stats` | GET | ✅ | `computeStats()` over both tables; `force-dynamic`, `no-store` |
| `/api/auth/[...nextauth]` | * | — | next-auth handlers |

Every authenticated route returns `401 {"error":"Unauthorized"}` when `session.user.id` is
missing, and `500` with the error logged server-side on failure.

---

## 🗄️ Database Schema

`lib/db/schema.ts` — five tables.

| Table | Key | Purpose |
|---|---|---|
| `user` | `id` (uuid) | `name`, `email` (unique), `password` (bcrypt), `createdAt` |
| `watch_progress` | `id`, one row per (user, tmdbId) | Mutable resume pointer. `show_progress` JSON, `genres` JSON, `nextEpisodeKey`, `dismissedAt` |
| `watch_history` | unique `(userId, episodeKey)` | The durable ledger. `event`, `watchedSeconds`, `runtimeSeconds`, `occurredAt`, `updatedAt` |
| `watchlist` | `id`, one row per (user, tmdbId, mediaType) | My List. `addedAt`, `watchedAt`, `folderName` |
| `user_settings` | `userId` (PK) | The whole `UserSettings` blob as JSON + `updatedAt` |

Uniqueness for `watch_progress` and `watchlist` is enforced in **application logic**, not by
a DB constraint (the sync routes read-then-write); `watch_history` has a real
`uniqueIndex("watch_history_user_episode_idx")`.

> ⚠️ **`updatedAt` / `occurredAt` / `addedAt` / `watchedAt` / `dismissedAt` are `bigint`,
> not `integer`.** They store `Date.now()` (epoch-ms, ~13 digits); Postgres `integer` tops
> out at 2,147,483,647, so `integer` silently overflows every write. Any new synced
> timestamp column must be `bigint("col", { mode: "number" })`.

---

## 🔑 Client Storage Keys

Useful when debugging in DevTools.

**localStorage**

| Key | Contents |
|---|---|
| `progress-{tmdbId}` | One `WatchProgress` record per title |
| `cinemaphora-history-events` | The history log (capped at 2000 rows) |
| `cinemaphora-history-dirty` | Ids changed since the last successful flush |
| `cinemaphora-deleted-progress` | Progress tombstones (30-day TTL) |
| `cinemaphora-wishlist` | My List (`WISHLIST_KEY`, exported by `lib/wishlistTracker.ts`) |
| `cinemaphora-deleted-watchlist` | Wishlist tombstones |
| `cinemaphora-wishlist-folders` | User-created folder names |
| `cinemaphora-geo` | `{ countryCode, countryName }` from the shared geo utility |
| `searchHistory` | Recent search queries (max 10) |
| `cinemaphora_cached_profile_stats_v5` | Last stats payload, for instant paint |

**Cookies**

| Cookie | Contents |
|---|---|
| `cinemaphora_terms` | `'true'` / `'false'` — read by middleware |
| `cp_*` | One per `UserSettings` key, plus `cp_updatedAt` |

**Custom window events**

| Event | Fired when |
|---|---|
| `cinemaphora:progress-sync` (`PROGRESS_SYNC_EVENT`) | `mergeRemoteProgress`/`setNextEpisodeKey` changed localStorage — needed because the native `storage` event doesn't fire in the tab that wrote |
| `cinemaphora:wishlist-sync` (`WISHLIST_SYNC_EVENT`) | Same, for the wishlist |
| `termsAccepted` (`TERMS_EVENT`) | Terms cookie changed |

---

## 📁 Folder Structure

```text
├── app/
│   ├── actions/auth.ts        # Server actions: register, check-email, display name, password, delete account
│   ├── api/
│   │   ├── auth/[...nextauth]/           # next-auth route handler
│   │   ├── tmdb/[...path]/               # Secure TMDB proxy
│   │   ├── countries/                    # Country + language list (24h cache)
│   │   ├── upcoming-episodes/            # New/upcoming episode resolver (stateless)
│   │   ├── get-progress/, sync-progress/
│   │   ├── get-history/,  sync-history/
│   │   ├── get-watchlist/, sync-watchlist/
│   │   ├── get-settings/, sync-settings/
│   │   └── get-stats/                    # Aggregated profile stats
│   ├── details/[id]/         # Movie / TV detail page
│   ├── discover/             # Generic filtered grid (+ error.tsx)
│   ├── declined/             # Terms-declined gate
│   ├── login/, register/     # Auth pages (+ *Client.tsx)
│   ├── now-playing/, popular/, top-rated/, trending/, upcoming/, providers/
│   ├── person/[id]/          # Actor / crew filmography
│   ├── profile/              # Stats · History · Account tabs
│   ├── search/               # Multi-search
│   ├── settings/             # Preferences (guests included)
│   ├── terms/, privacy/      # Legal pages
│   ├── watch/[id]/           # Player page + WatchClient
│   ├── wishlist/             # My List
│   ├── ~offline/             # PWA offline fallback
│   ├── layout.tsx            # HTML shell, providers, no-FOUC theme script
│   ├── manifest.ts           # PWA manifest
│   ├── error.tsx, not-found.tsx, loading.tsx
│   ├── page.tsx              # Home
│   └── globals.css           # CSS variables (7 themes), resets, utilities
├── components/
│   ├── AccountSettings.tsx      # Change password / delete account
│   ├── ActionButtons.tsx        # Add to list + share (details page)
│   ├── ActivityLineChart.tsx    # 90-day activity timeline
│   ├── CapacitorInit.tsx        # Native back button, splash, fullscreen orientation
│   ├── CardRow.tsx              # Shared rail chrome for the personal rows
│   ├── ContinueWatchingRow.tsx  # Resume rail
│   ├── CustomSelect.tsx / MultiSelect.tsx
│   ├── DetailsTabs.tsx          # Watch / Trailers / Cast / Reviews / Where to Watch
│   ├── DiscoveryFeed.tsx        # Unified infinite scroll for every grid
│   ├── EpisodeSelector.tsx      # Season + episode picker
│   ├── FeaturedStrip.tsx        # Compact themed strip under the hero
│   ├── FilterBar.tsx            # Filters, multi-selects, saved presets
│   ├── Footer.tsx, Navbar.tsx, MobileHeader.tsx, MobileNav.tsx
│   ├── GenreDonutChart.tsx      # Top genres, range-filterable
│   ├── HeroBanner.tsx / HomeHero.tsx
│   ├── Loading.tsx / LoadingSpinner.tsx
│   ├── MediaCard.tsx, MediaRow.tsx, MediaSplitCard.tsx
│   ├── Modal.tsx                # Shared confirm dialog
│   ├── MoodPickerModal.tsx      # 12 moods → prefiltered /discover
│   ├── OfflineTrailerWrapper.tsx
│   ├── PlayerIframe.tsx         # Provider orchestration + progress capture
│   ├── ProfileStats.tsx         # Stats dashboard
│   ├── ProviderTabs.tsx         # Platform switcher
│   ├── ScrollToTop.tsx, TimeRangeSelector.tsx, TopStreamedCard.tsx
│   ├── SettingsProvider.tsx     # Settings context — cookies + DB sync
│   ├── SyncManager.tsx          # Poll + flush both directions
│   ├── TermsAgreementModal.tsx
│   ├── Top10Row.tsx             # Geo-detected Top 10 (movies + TV)
│   ├── TrailerIframe.tsx, WatchProviders.tsx, WatchTvButton.tsx
│   └── WatchHistoryList.tsx     # Paginated, filterable history
├── hooks/useOnlineStatus.ts
├── lib/
│   ├── tmdb.ts               # Types, tmdbFetch, all TMDB helpers, image URL builders
│   ├── episodes.ts           # Pure episode-ordering / availability logic (client + server)
│   ├── progressTracker.ts    # Watch progress + history — local-first, DB-synced
│   ├── wishlistTracker.ts    # My List — same pattern
│   ├── stats.ts              # Pure computeStats()
│   ├── settings.ts           # UserSettings, cookie IO, DOM mirroring, sync
│   ├── authSync.ts           # Post-login reconciliation
│   ├── streamingProvider.ts  # Env → configured provider list
│   ├── providers/            # Provider registry + shared types
│   ├── db/index.ts           # Hyperdrive-aware dbQuery() with retries
│   ├── db/schema.ts          # Drizzle schema
│   ├── geo.ts                # Shared geo detection + cache
│   ├── terms.ts              # Terms cookie + TERMS_EVENT
│   └── useCountries.ts       # Region/language hook
├── scripts/verify-*.ts       # Logic checks run by `npm test`
├── proxy-worker/             # Ad-filtering Cloudflare Worker (separate deploy)
├── android/                  # Capacitor Android project
├── auth.ts                   # next-auth config
├── middleware.ts             # Terms gate + crawler passthrough
├── instrumentation.ts        # IPv4-first DNS + stdout/stderr key redaction
├── next.config.ts            # Standalone output, PWA, image patterns, OpenNext dev hook
├── wrangler.jsonc            # Worker config, Hyperdrive + Images bindings
├── open-next.config.ts       # OpenNext Cloudflare adapter
├── drizzle.config.ts         # drizzle-kit (push mode)
├── capacitor.config.ts       # Android shell config
├── Dockerfile / Dockerfile.dev / docker-compose.yaml
└── public/                   # Static assets, PWA icons
```

---

## 📐 Code Quality Rules

Self-imposed and enforced across the codebase:

1. **No function definitions inside `useEffect`.** Only *calls*. Logic lives in named
   module-level functions or `useCallback`s declared before the effect.
2. **No God Components.** Server pages orchestrate fetching and composition only; complex
   interactive logic lives in a sibling `*Client.tsx`.
3. **No prop drilling.** Fetch as close to the consumer as possible; shared state goes in
   context.
4. **Conditional sentinel rendering** for infinite scroll — unmount it when exhausted.
5. **`Promise.allSettled` on the home page.** No single TMDB failure can break the page.
6. **CSS Modules only.** No `style={{}}` in `.tsx`, no Tailwind.
7. **Hooks before early returns.** See `WatchClient` — handlers are declared above the
   `servers.length === 0` bail-out so hook order never changes between renders.
8. **Pure logic in `lib/`.** Anything both the client and a route handler needs
   (`episodes.ts`, `stats.ts`) must stay free of browser APIs and DB access, so it can be
   verified in isolation.
9. **Plain comments.** No decorative ASCII-line banner comments in new code.

---

## 🎨 Styling Guidelines

- Every colour, spacing value and shadow is a CSS variable in `app/globals.css`.
- **Seven themes** are defined there via `[data-theme="…"]`: `light` (also `:root`), `warm`,
  `dark`, `cinema`, `amoled`, `dim` — plus `system`, which resolves to light/dark at runtime.
  A new theme means adding a `[data-theme]` block *and* the `Theme` union in `lib/settings.ts`
  *and* the button list in `SettingsClient`.
- Creating `MyComponent.tsx` means creating `MyComponent.module.css` beside it.
- Shared utility classes (`page-container`, `page-content`, `section-header`,
  `section-title`, `btn`, `badge`, `skeleton`, `empty-state`) live in `globals.css`.
- **Do not add Tailwind** unless explicitly requested.

---

## 🧪 Testing

There is **no test runner**. `npm test` runs three `tsx` scripts that exit non-zero on
failure — deliberately narrow, covering the logic that's hardest to eyeball:

| Script | Pins down |
|---|---|
| `scripts/verify-next-episode.ts` | `buildNextEpisodeKey` / `airedEpisodesAfter` across mid-season, unaired-next, finale-returning, finale-ended, canceled and season-rollover cases |
| `scripts/verify-rails.ts` | The Continue Watching ↔ Upcoming Episodes hand-off: every watched show lands in exactly one rail, never both |
| `scripts/verify-stats.ts` | `computeStats` survives a title being removed from Continue Watching — the hours stay on the board |

```bash
npm test
```

New pure logic in `lib/` should come with a verify script in the same style.

---

## 🤖 CI

`.github/workflows/ci.yml` runs on PRs into `master` (Node 22):

1. `npm ci`
2. `npm run cf-typegen` — `worker-configuration.d.ts` is git-ignored, and without
   regenerating it `CloudflareEnv` falls back to a bare declaration missing `HYPERDRIVE`,
   and typecheck fails.
3. `npm run typecheck`
4. `npm run build`

> CI does **not** currently run `npm test` or ESLint — run them locally.

Other workflows: `auto-pr.yml` opens a PR into `master` for any non-master push;
`android-build.yml` builds a debug APK for `feat/android-**` branches.

---

## 🚀 Deployment

### Cloudflare Workers (primary)

```bash
npm run deploy     # build → build:worker → wrangler deploy
```

`wrangler.jsonc` declares:
- `main: .open-next/worker.js` and the `.open-next/assets` static binding,
- `nodejs_compat`,
- a **`HYPERDRIVE`** binding (created against Supabase's *direct* connection string —
  Hyperdrive does its own pooling),
- an `IMAGES` binding and a `WORKER_SELF_REFERENCE` service binding.

Secrets to set in the Cloudflare dashboard (or via `wrangler secret put`): `TMDB_API_KEY`,
`AUTH_SECRET`, `AUTH_TRUST_HOST`, and every `NEXT_PUBLIC_*` provider URL you want live.
Note that `NEXT_PUBLIC_*` values are inlined at **build** time, so they must be present in
the build environment, not only at runtime.

After changing bindings, re-run `npm run cf-typegen`.

### Docker

Production uses Next.js `output: "standalone"` in a multi-stage build.

```bash
# Pull the published image
docker pull ghcr.io/peterkahumu/cinemaphora:prod
docker run -d -p 3000:3000 --env-file .env.production ghcr.io/peterkahumu/cinemaphora:prod

# Or build locally
docker compose build cinemaphora-production
docker compose up cinemaphora-production -d
```

Requires a `.env.production` in the project root.

### Android

```bash
npx cap sync android
cd android && ./gradlew assembleDebug
```

Or push to a `feat/android-**` branch and let `android-build.yml` do it.

---

## ➕ Adding Things

**A new streaming provider**
1. Add an entry to `PROVIDERS` in `lib/providers/index.ts`, positioned by priority.
2. Give it an `envKey` (`NEXT_PUBLIC_*_URL`), a `tier`, and — if it emits events — an
   explicit trusted `origin` (string or array). **Never** accept `postMessage` without it.
3. Implement `buildUrl`. Reuse `handleStandardMessages` if it speaks the
   `MEDIA_DATA` + `PLAYER_EVENT` protocol.
4. Add the env var to `.env.example` and the docs.

**A new synced field**
1. Add the column to `lib/db/schema.ts` (timestamps → `bigint`!), run `npm run db:push`.
2. Extend the local type and merge logic in `lib/progressTracker.ts` /
   `lib/wishlistTracker.ts`.
3. Extend the matching `get-*` mapping and `sync-*` upsert.
4. Decide the conflict rule explicitly — last-write-wins, or max, or immutable.

**A new grid page**
Copy `app/popular/page.tsx`: fetch page 1 server-side, render `FilterBar` +
`DiscoveryFeed`, and key the feed on `searchParams`. Don't hand-roll infinite scroll.

**A new setting**
Add the key to `UserSettings` + `DEFAULT_SETTINGS` in `lib/settings.ts`, a `SettingRow` in
`SettingsClient`, and — if it affects rendering before paint — a line in the `theme-init`
script in `app/layout.tsx` plus `applySettingsToDOM`.

---

## 🐞 Gotchas

- **`bigint`, not `integer`,** for any epoch-ms column. This has bitten before.
- **`sendBeacon` fails silently** over ~64 KB, returning only `false`. Use `sendInChunks`.
- **The native `storage` event doesn't fire in the tab that wrote it** — that's why
  `PROGRESS_SYNC_EVENT` / `WISHLIST_SYNC_EVENT` exist.
- **`CAUGHT_UP` must never be cached as a conclusion.** It stops being true the moment the
  next episode airs; always re-resolve it.
- **Don't hard-delete progress** to implement "remove" — it takes the user's watch hours out
  of their stats. `dismissProgress` is the soft path.
- **`getCloudflareContext()` throws outside the Workers context** — `lib/db/index.ts`
  swallows that and falls back to env vars. Keep that try/catch.
- **`initOpenNextCloudflareForDev()` is gated to development** in `next.config.ts` — calling
  it during `next build` fails, since there's no local Hyperdrive string to emulate.
- **One `dbQuery` per logical unit of work.** Each call opens and closes a connection.
- **The Capacitor WebView ignores `max-age=0` cookie deletes** — write `false` with a
  far-future expiry instead.
- **`worker-configuration.d.ts` is generated and git-ignored.** Run `npm run cf-typegen`
  after cloning or changing bindings, or typecheck will fail on missing bindings.

---

## 🗂 Key TMDB Provider IDs

| Platform | TMDB Provider ID | Region |
|---|---|---|
| Netflix | 8 | US |
| Amazon Prime Video | 9 | US |
| Disney+ | 337 | US |
| Apple TV+ | 350 | US |
| Hulu | 15 | US |
| Peacock | 386 | US |

> Provider IDs are region-specific; these are for `watch_region=US`. Changing the region
> means updating both `lib/tmdb.ts` (`getProviderContent`) and
> `components/ProviderTabs.tsx` (`PROVIDERS`).

---

## 🐛 Contributing & Issues

See [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Issue Selection Guide](https://github.com/peterkahumu/Cinestream/wiki/Issue-Selection-Guide).

| Situation | Template |
|-----------|----------|
| Something is broken | 🐛 Bug Fix |
| New feature request | ✨ Enhancement |
| Idea or suggestion | 💡 Recommendation |
| Everything else | 📄 General |

Roadmap and shipped-feature log: [coming_soon.md](./coming_soon.md).
Open design questions: [planning.md](./planning.md).
