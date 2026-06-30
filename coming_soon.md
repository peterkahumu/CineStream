# 🚀 CinemaPhora — Roadmap

What's been shipped and what's planned next.

---

## ✅ Shipped

### Discovery & Navigation
- [x] **Homepage Hero Carousel:** Auto-rotating banner cycling through top trending content with smooth fade transitions and indicator dots.
- [x] **Trending This Week page** (`/trending`): Dedicated route hitting the TMDB trending endpoint — filterable by All / Movies / TV, with infinite scroll.
- [x] **Coming Soon page** (`/upcoming`): Movies and TV shows releasing in the next 3 months. Matches the homepage row exactly.
- [x] **Provider pages** (`/provider/[id]`): Dedicated routes for Netflix, Prime Video, and Disney+ showing releases from the last 6 months.
- [x] **Correct "See All →" links:** Every homepage row links to its own purpose-built route (not a generic discover fallback).
- [x] **Discover page deep-linking:** Supports `with_watch_providers`, date range, and all other TMDB filter params via URL.

### Content Sections
- [x] **Top 10 in Your Country:** Two rows (Movies + TV) built from geo-IP detection. Toast notification on detection. Hidden gracefully on failure.
- [x] **Now Playing / Currently On Air:** Dedicated rows for theatrical releases and actively airing shows.
- [x] **Netflix / Prime Video / Disney+ rows:** Six rows (movie + TV per provider), linked to correct provider pages.
- [x] **Upcoming Movies & TV Shows:** Date-bounded to the next 3 months, sorted by popularity.
- [x] **Popular Movies / TV Shows & Top Rated:** Standard discovery rows.

### Details Page
- [x] **"Coming on [date]" label:** For movies with a future `release_date`, and for TV shows with a future `next_episode_to_air.air_date`, the Watch button is replaced with a non-clickable date label.
- [x] **Watch tab hidden for upcoming TV shows:** No episodes to stream yet — the tab is suppressed automatically.
- [x] **Breadcrumb navigation:** Home → Media Type → Title.
- [x] **Tabs:** Trailers, Cast, Reviews (Watch tab for TV when available).
- [x] **Recommendations & Similar:** Scrollable rows below the player.

### Player & Watch
- [x] **Multi-server support:** Up to four streaming servers; user can switch if one fails.
- [x] **🎬 Lights Out mode:** Dims surrounding UI for focused viewing.
- [x] **TV Episode Selector:** Season/episode picker sidebar on the watch page.
- [x] **URL cleanup:** Season/episode params stripped from the URL bar after load.

### Search
- [x] **Realtime search:** Debounced — results update as you type.
- [x] **Type filter tabs:** All / Movies / TV Shows.
- [x] **Infinite scroll:** Loads more pages automatically.

### Technical
- [x] **API key never exposed:** All TMDB calls from the client go through a server-side proxy route (`/api/tmdb/...`).
- [x] **`Promise.allSettled` on homepage:** A single failing row never breaks the page.
- [x] **Conditional sentinel:** IntersectionObserver sentinel is removed from the DOM when exhausted, preventing footer flash.
- [x] **No function definitions inside `useEffect`:** Enforced across all components.
- [x] **Dead code removed:** `ApiKeyModal`, `useApiKey`, `vercel.json`, scratch test files.
- [x] **Installable PWA:** Offline image caching, service worker, manifest.
- [x] **Native mobile support (Capacitor):** Back-button handling, fullscreen orientation, status bar management.
- [x] **SEO metadata:** Dynamic `<title>` and Open Graph tags on all pages.

---

## 🔜 Planned

### Personalisation & State
- [ ] **"Continue Watching" Row:** Track viewing progress, surface incomplete episodes/movies on the homepage.
- [ ] **Watchlists / Favourites:** Save titles for later (initially `localStorage`, migrated to DB when users grow).
- [ ] **Watch History:** Dedicated page showing previously watched content.

### Immersive UX
- [ ] **Auto-playing Trailers:** Silent auto-play on the details page hero.
- [ ] **Next Episode Auto-Play:** 10-second countdown to the next TV episode.
- [ ] **Skeleton Loaders:** Replace spinners with animated skeleton cards.

### Technical
- [ ] **True OLED Dark Mode:** "True Black" theme (`#000000`) for battery savings and low-light.
- [ ] **Offline Downloads (Capacitor/Android):** Cache media for offline viewing on native builds.
- [ ] **User accounts / database:** Required before any server-side personalisation features can ship.
