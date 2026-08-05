# 🚀 CinemaPhora — Roadmap

What's been shipped and what's planned next.

---

## ✅ Shipped

### Discovery & Navigation
- ✅ **Homepage Hero Carousel:** Auto-rotating banner cycling through top trending content with smooth fade transitions and indicator dots.
- ✅ **Trending This Week page** (`/trending`): Dedicated route hitting the TMDB trending endpoint — filterable by All / Movies / TV, with infinite scroll.
- ✅ **Coming Soon page** (`/upcoming`): Movies and TV shows releasing in the next 3 months. Matches the homepage row exactly.
- ✅ **Provider pages** (`/provider/[id]`): Dedicated routes for streaming providers showing releases from the last 6 months.
- ✅ **Correct "See All →" links:** Every homepage row links to its own purpose-built route (not a generic discover fallback).
- ✅ **Discover page deep-linking:** Supports `with_watch_providers`, date range, and all other TMDB filter params via URL.

### Content Sections
- ✅ **Top 10 in Your Country:** Two rows (Movies + TV) built from geo-IP detection. Toast notification on detection. Hidden gracefully on failure.
- ✅ **Now Playing / Currently On Air:** Dedicated rows for theatrical releases and actively airing shows.
- ✅ **Netflix / Prime Video / Disney+ rows:** Six rows (movie + TV per provider), linked to correct provider pages. *(Note: Other providers are available in the Discover page, and we plan to accommodate them on the homepage in the future).*
- ✅ **Upcoming Movies & TV Shows:** Date-bounded to the next 3 months, sorted by popularity.
- ✅ **Popular Movies / TV Shows & Top Rated:** Standard discovery rows.

### Details Page
- ✅ **"Coming on [date]" label:** For movies with a future `release_date`, and for TV shows with a future `next_episode_to_air.air_date`, the Watch button is replaced with a non-clickable date label.
- ✅ **Watch tab hidden for upcoming TV shows:** No episodes to stream yet — the tab is suppressed automatically.
- ✅ **Breadcrumb navigation:** Home → Media Type → Title.
- ✅ **Tabs:** Trailers, Cast, Reviews, **Where to Watch** (Watch tab for TV when available).
- ✅ **Recommendations & Similar:** Scrollable rows below the player.

### Player & Watch
- ✅ **Multi-server support:** Up to 9 streaming servers configured in `.env.local`; user can switch if one fails.
- ✅ **🎬 Lights Out mode:** Dims surrounding UI for focused viewing.
- ✅ **TV Episode Selector:** Season/episode picker sidebar on the watch page.
- ✅ **URL cleanup:** Season/episode params stripped from the URL bar after load.

### Search
- ✅ **Realtime search:** Debounced — results update as you type.
- ✅ **Type filter tabs:** All / Movies / TV Shows.
- ✅ **Infinite scroll:** Loads more pages automatically.

### Personalisation & State
- ✅ **User Accounts:** Email/password accounts (`next-auth` + Postgres via Drizzle). Guests keep the full local-storage experience; signed-in users additionally get everything below synced across devices.
- ✅ **"Continue Watching" Row:** Tracks viewing progress locally first, then syncs to the DB for signed-in users — resume on any device, Netflix-style. *(Note: This feature depends on the active streaming server emitting progress events. Other servers just serve streaming functionality).*
- ✅ **Watch History & Stats:** A durable "started"/"completed" event log (`/profile`), separate from Continue Watching's resume pointer — survives rewatches and removal from Continue Watching. Powers a stats strip (titles watched, total watch time, movies/TV split, weekly activity, top genres).
- ✅ **Cross-Device Settings Sync:** Signed-in users' preferences (`/settings`) sync to the DB, latest-change-wins. Guests keep the cookie-only experience — Settings is available to everyone, signed in or not.
- ✅ **Legal & Compliance:** Mandatory Terms of Use / Privacy Policy modal agreement. Settings page to manage agreement.
- 🚧 **Watchlists / Favourites (Partially Shipped):** Users can save titles for later using local storage. (Database integration planned for future scale — the `watchlist` table exists but isn't wired up yet).

### Technical
- ✅ **True OLED Dark Mode:** "True Black" theme (`#000000`) implemented (`data-theme="amoled"`).
- ✅ **API key never exposed:** All TMDB calls from the client go through a server-side proxy route (`/api/tmdb/...`).
- ✅ **`Promise.allSettled` on homepage:** A single failing row never breaks the page.
- ✅ **Conditional sentinel:** IntersectionObserver sentinel is removed from the DOM when exhausted, preventing footer flash.
- ✅ **No function definitions inside `useEffect`:** Enforced across all components.
- ✅ **Installable PWA:** Offline image caching, service worker, manifest.
- ✅ **Native mobile support (Capacitor):** Back-button handling, fullscreen orientation, status bar management.
- ✅ **SEO metadata:** Dynamic `<title>` and Open Graph tags on all pages.

---

## 🔜 Planned

### Immersive UX
- [ ] **Auto-playing Trailers:** Silent auto-play on the details page hero.
- [ ] **Skeleton Loaders:** Replace spinners with animated skeleton cards.

### Technical
- [ ] **Offline Downloads (Capacitor/Android):** Cache media for offline viewing on native builds.
- [ ] **Watchlist DB Sync:** Wire the existing `watchlist` table up to the same local-first/DB-synced pattern used by watch progress, history, and settings.

---

## ℹ️ Notes on Features Dependent on Third-Party Servers
*Certain features are highly dependent on whether the third-party iframe streaming provider emits the necessary postMessage events:*
- **Watch History & Continue Watching:** Relies on progress updates from the active server.
- **Next Episode Auto-Play:** Some servers support auto-playing the next episode natively within their iframe, but it cannot be universally enforced on our end without standard event emitters.
