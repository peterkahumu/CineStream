# Planning — Open Work & Design Decisions 🧭

This file tracks **design decisions and open work**. For the shipped-feature log and the
forward-looking roadmap, see [coming_soon.md](./coming_soon.md).

---

## ✅ Shipped (kept here for the reasoning)

<details>
<summary><strong>Server-side route protection & deep-link memory</strong></summary>

Originally two separate items: move the terms flag off `localStorage`, and stop losing the
user's intended destination.

Both are live in `middleware.ts`:
- `cinemaphora_terms` is a **cookie**, so it's readable server-side.
- **Middleware** intercepts every request before render — unaccepted users never receive
  protected HTML, with zero flash-of-content, and `Googlebot`/other crawler user-agents pass
  through untouched for SEO.
- Unaccepted users are redirected to `/declined?redirect=<original-path+query>`, and
  accepting sends them back exactly where they were headed.

</details>

<details>
<summary><strong>Cross-device sync (progress, history, wishlist, settings)</strong></summary>

All four now follow one pattern — local-first write, debounced DB push, explicit conflict
rule, tombstones for deletions, `sendBeacon` flush on unload. See
[DEVELOPER.md → Local-First Sync](./DEVELOPER.md#local-first-sync).

The decision worth recording: **guests were never treated as second-class.** DB sync is an
opt-in argument (`isAuthenticated`) on every write path rather than an assumption, so a
signed-out user makes zero sync requests and loses no features.

</details>

<details>
<summary><strong>Watch history as the durable ledger</strong></summary>

Stats used to be computed from `watch_progress`, which meant removing something from
Continue Watching silently deleted the hours you'd watched. `watch_history` now carries its
own `watchedSeconds`/`runtimeSeconds`, `computeStats` merges both tables per episode taking
the larger value, and the Continue Watching × is a **soft dismiss** (`dismissedAt`) rather
than a delete. `scripts/verify-stats.ts` pins this down.

</details>

<details>
<summary><strong>Never guess the next episode</strong></summary>

`seasons[].episode_count` includes unaired episodes, so `episode + 1` regularly pointed at
something no server could play. `lib/episodes.ts` now resolves against
`last_episode_to_air` and returns one of four explicit answers
(`s{n}e{n}` / `CAUGHT_UP` / `SERIES_FINISHED` / `null`), and the two personal rails hand
titles between each other based on it. `scripts/verify-next-episode.ts` and
`scripts/verify-rails.ts` pin both halves.

</details>

---

## 🔧 Open — settings that exist but do nothing

Four keys are declared in `UserSettings` (`lib/settings.ts`) and stored/synced correctly,
but nothing reads them. Each is a small, self-contained fix.

- [ ] **`preferredProviders`** (`number[]`) — no UI control and no consumer. Either add a
  provider multi-select in Settings → Content & Discovery that biases the provider rows and
  `/providers` default tab, or drop the key.
- [ ] **`saveSearchHistory`** — the toggle renders, but `Navbar.tsx` and `MobileHeader.tsx`
  write to the `searchHistory` localStorage key unconditionally. Both `submit()` handlers
  need to check the setting before persisting.
- [ ] **`defaultSortWishlist`** — `WishlistClient` keeps its own `sortBy` state initialised
  to `'date-desc'` and never reads the setting. Should seed from it.
- [ ] **Age-rating ceiling coverage** — `cp_maxCertification` is applied on `/`, `/discover`
  and the `/api/tmdb` proxy's discover endpoints, but *not* to `/trending`, `/popular`,
  `/top-rated`, `/now-playing` or search, because those TMDB endpoints don't accept
  certification params. Worth deciding whether to filter those client-side or document the
  limitation in the UI.

---

## 🔧 Open — `/discover` ignores params we link to

`app/discover/page.tsx` builds `apiParams` from an explicit allow-list. Three params are
linked to from elsewhere in the app and silently dropped:

- [ ] **`maxPopularity`** — home page "Hidden Gems → See All" links to
  `/discover?sort=vote_average.desc&minRating=7.5&maxPopularity=30`. Needs mapping to
  `popularity.lte`.
- [ ] **`status`** — home page "Returning Soon → See All" links to
  `/discover?media=tv&status=returning`. Needs mapping to `with_status`.
- [ ] **`collection`** — the details-page collection badge links to
  `/discover?media=movie&collection=<id>`. TMDB discover has no collection filter; this
  probably wants a dedicated `/collection/[id]` route hitting `/collection/{id}` instead.

Until these land, those three "See All" links quietly return an unfiltered grid.

---

## 🔧 Open — settings on the server

`app/layout.tsx` still applies theme, reduce-motion, data-saver and layout via a
`beforeInteractive` inline script reading `document.cookie`, rather than having a Server
Component read the cookie and stamp `<html data-theme>` during SSR.

The pieces are already in place — `app/page.tsx` and `app/discover/page.tsx` both read
`cp_maxCertification` server-side via `cookies()` — so this is mechanical. The reason it
hasn't been done: reading cookies in the root layout opts the whole tree out of static
rendering, which would cost the home page its `revalidate = 300`. **Decision needed:**
accept fully dynamic rendering, or keep the inline script.

Not blocking anything — the script runs before first paint, so there's no visible flash today.

---

## 🔧 Open — quality & tooling

- [ ] **CI doesn't run `npm test` or ESLint.** `.github/workflows/ci.yml` does
  `cf-typegen → typecheck → build` only. Adding the two is a three-line change and the
  verify scripts already exit non-zero on failure.
- [ ] **Dead Tailwind classes.** `components/Navbar.tsx:283` styles the Sign In link with
  `px-3 py-1 bg-blue-600 …`. There is no Tailwind in this project, so the link is unstyled.
  Should move to `Navbar.module.css`.
- [ ] **Inline styles in `FeaturedStrip.tsx`** violate the CSS-Modules-only rule
  (`DEVELOPER.md` code quality rule 6). Move them into `FeaturedStrip.module.css`.
- [ ] **Stale doc comment** in `app/api/get-history/route.ts` describes history events as
  "append-only". They've been upsert-per-episode since the ledger rewrite; the comment
  contradicts both the schema and `logHistoryEvent`.
- [ ] **`any` in the grid pages.** `/discover` and `/providers` cast `discover({...} as any)`
  and hold `initialItems: any[]`. `DiscoverParams` already has an index signature — these
  can be typed properly.

---

## 🔧 Open — accessibility & UX (from the original settings vision)

- [ ] **High Contrast Mode / UI Scaling** — never implemented. Would slot in beside the
  existing seven themes as another `[data-theme]` block plus a root font-size variable.
- [ ] **Hide "Watched" Items** — filter titles you've completed out of discovery grids.
  The data exists (`watch_history` completion state); the filter doesn't.
- [ ] **Skeleton loaders** — several grids still show a spinner where an animated skeleton
  card would read better. `globals.css` already has a `.skeleton` utility, and
  `PlayerIframe` uses it while resolving resume time.

---

## 💭 Larger, undecided

- **Offline downloads (Capacitor/Android).** Genuinely useful for the native build, but it
  means caching third-party stream segments, which has both technical and legal weight.
  No design yet.
- **Auto-playing trailers on the details hero.** The `autoplayTrailers` setting is already
  wired through to `TrailerIframe`; what's missing is the muted hero autoplay itself.
- **Watch-party / shared sessions.** Frequently requested, would need a realtime transport
  (Durable Objects would fit the existing Cloudflare deployment). Not scoped.
- **Retiring the `activePlaybackId` guard.** It exists because timestamp comparison can't
  referee two devices playing the same title simultaneously. A per-device sequence number or
  CRDT-ish merge would be more principled than "don't touch the active title" — but the
  current rule is simple and has held up.
