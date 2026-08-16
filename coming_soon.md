# 🚀 CinemaPhora — Roadmap

What's shipped and what's planned next. Design decisions and known gaps live in
[planning.md](./planning.md).

---

## ✅ Shipped

### Discovery & Navigation
- ✅ **Homepage hero carousel** — auto-rotating backdrops with fade transitions and
  indicator dots.
- ✅ **Seasonal themed strip** — the strip under the hero changes with the calendar
  (🎃 October, 🎄 December, 💖 February) and the day of the week (💥 weekends,
  😂 Sundays), falling back to 🌟 Editor's Picks.
- ✅ **🎭 Mood picker** — twelve moods that route to a pre-filtered Discover page.
- ✅ **Category pages** — `/trending`, `/popular`, `/top-rated`, `/now-playing`,
  `/upcoming`, all with Movies/TV toggles and infinite scroll.
- ✅ **Provider hub** (`/providers`) — Netflix, Prime Video, Disney+, Apple TV+, Hulu and
  Peacock, showing each platform's last 6 months.
- ✅ **Correct "See All →" links** — every homepage row points at a purpose-built route
  showing exactly that row's content, not a generic fallback. *(Three params still get
  dropped by `/discover` — see [planning.md](./planning.md).)*
- ✅ **Discover deep-linking** — genre, country, language, year, rating, sort, watch
  providers and date ranges all round-trip through the URL.
- ✅ **Saved filter presets** — name a filter combination and recall it later.
- ✅ **Multi-select filters** for genre, country and language.

### Content Sections
- ✅ **Top 10 in your country** — two geo-IP-derived rows with a location toast, hidden
  gracefully when the lookup fails.
- ✅ **Now Playing / Currently On Air.**
- ✅ **Hidden Gems, Binge-Worthy TV, Returning Soon.**
- ✅ **Netflix / Prime Video / Disney+ rows** — six rows total, movie + TV per provider.
- ✅ **Coming Soon** — date-bounded to the next 3 months, sorted by popularity.
- ✅ **Popular & Top Rated** rows for movies and TV.

### Details Page
- ✅ **"Coming on [date]"** — replaces the Watch button for unreleased movies and
  unpremiered shows.
- ✅ **Watch tab suppressed** for upcoming TV — nothing to stream yet.
- ✅ **Breadcrumbs**, collection badge, certification/age-rating chip, status badge.
- ✅ **Tabs** — Watch (TV), Trailers, Cast, Reviews, Where to Watch.
- ✅ **Per-season trailers** for multi-season shows, falling back to the series trailer.
- ✅ **More from the Director / Creator**, plus Recommendations and Similar rows.
- ✅ **Autoplay Trailers setting** honoured server-side, so the embed renders with the
  right `?autoplay=` and there's no hydration mismatch.

### Player & Watch
- ✅ **Multi-server support** — up to 9 servers, switchable mid-session, each badged
  ⚡ advanced or basic with an explicit capability line.
- ✅ **Ad-filtering proxy** — an optional Cloudflare Worker that strips ad networks, blocks
  pop-unders and neutralises redirects, with a per-server **🛡️ Filter / ⚡ Direct** toggle.
- ✅ **Auto-resume** from the furthest position reached, locally or from the server.
- ✅ **Correct episode navigation** — Prev/Next derived from TMDB airing data, so Next
  disappears rather than offering an episode that hasn't aired.
- ✅ **Provider event normalisation** — origin-validated `postMessage`, stale-iframe
  rejection, and per-episode progress keys rebuilt into one canonical format.

### Search
- ✅ **Realtime search** with a 300 ms debounce and inline poster previews.
- ✅ <kbd>/</kbd> **keyboard shortcut** to focus search, <kbd>Esc</kbd> to close.
- ✅ **Recent searches**, type filter tabs, infinite scroll.

### Personalisation & State
- ✅ **User accounts** — email/password via `next-auth` + Postgres. Optional; guests keep
  every feature, just device-local.
- ✅ **Continue Watching** — advances on episode completion, retires on a finale, and hands
  a caught-up show over to the Upcoming rail.
- ✅ **New & Upcoming Episodes rail** — surfaces shows that moved on without you, including
  a series you finished months ago quietly returning.
- ✅ **Watch history & stats** — a durable per-episode ledger, separate from the resume
  pointer, that survives rewatches and Continue Watching removals. Powers the full profile
  dashboard: watch time, completion rate, streaks, 90-day activity timeline, top genres,
  top streamed titles.
- ✅ **My List** — folders, watched state, search, sort, per-item actions, and full DB sync.
- ✅ **Wishlist export/import** as JSON.
- ✅ **Cross-device settings sync**, latest-change-wins; Settings is open to guests too.
- ✅ **Account management** — display name, change password, delete account (cascades every
  synced row).
- ✅ **Legal & compliance** — mandatory Terms/Privacy agreement, revocable from Settings.

### Technical
- ✅ **API key never exposed** — server-side proxy plus stdout/stderr redaction as defence
  in depth.
- ✅ **Server-side terms gate** in middleware, with crawler passthrough for SEO.
- ✅ **Seven themes** including true-black AMOLED, plus reduce-motion and data-saver modes.
- ✅ **Age-rating ceiling** applied server-side on discovery endpoints.
- ✅ **`Promise.allSettled` on the homepage** — one failing row never breaks the page.
- ✅ **Conditional IntersectionObserver sentinel** — removed from the DOM when exhausted.
- ✅ **No function definitions inside `useEffect`** — enforced across all components.
- ✅ **Installable PWA** — service worker, offline fallback page, TMDB image caching,
  manifest.
- ✅ **Native Android via Capacitor** — back-button handling, splash, status bar, fullscreen
  landscape lock, plus a CI workflow that builds the APK.
- ✅ **Cloudflare Workers deployment** via OpenNext, with Supabase reached through
  Hyperdrive and automatic retry/back-off on transient connection errors.
- ✅ **SEO metadata** — dynamic titles, Open Graph and Twitter cards on every page.
- ✅ **Logic verification scripts** (`npm test`) covering next-episode resolution, the
  two-rail hand-off, and stats durability.

---

## 🔜 Planned

### Immersive UX
- [ ] **Auto-playing trailers on the details hero** — silent, muted background playback.
  (The setting and the server-side plumbing already exist; the hero treatment doesn't.)
- [ ] **Skeleton loaders** — replace the remaining spinners with animated skeleton cards.
- [ ] **High contrast mode & UI scaling.**
- [ ] **Hide "Watched" items** from discovery grids.

### Discovery
- [ ] **Collections route** — a real `/collection/[id]` page, so the details-page collection
  badge stops linking at a filter TMDB's discover endpoint can't express.
- [ ] **More provider rows on the homepage** — the hub already covers six platforms; the
  homepage still only surfaces three.
- [ ] **Honour `preferredProviders`** — let the setting bias the provider rows and the
  default `/providers` tab.

### Technical
- [ ] **Run `npm test` and ESLint in CI** alongside typecheck and build.
- [ ] **Offline downloads (Capacitor/Android)** — cache media for offline viewing on native
  builds. Design not started.
- [ ] **R2 incremental cache** for the Cloudflare deployment (the OpenNext override is
  already stubbed in `open-next.config.ts`).

---

## ℹ️ Features That Depend on Third-Party Servers

Some behaviour is only as good as the streaming provider's iframe:

- **Watch history & Continue Watching** need the active server to emit progress events.
  Servers badged **Basic** in the player emit nothing, so nothing is tracked on them — the
  UI says so explicitly rather than failing silently.
- **Next-episode auto-play** is supported natively by some servers (VidFast's `autoNext`,
  CineSRC's `cinesrc:nextepisode`) but can't be enforced universally. Where a provider does
  fire it, CinemaPhora overrides the target with its own TMDB-derived answer, because
  players routinely report "next" as current + 1.
- **Cross-device resume** requires a server that accepts a start-time URL param
  (`resumeAt` / `startAt` / `t` / `progress`, depending on the provider).
