# 🎬 CinemaPhora

A sleek, ad-free, high-performance web app for discovering and watching movies and TV shows.
Built on Next.js 16 and TMDB, deployed to Cloudflare Workers, installable as a PWA, and
wrapped as a native Android app.

---

## 📖 Documentation

| I want to… | Read |
|---|---|
| Browse, search, watch, and use my account | 🍿 **[User Guide → USER.md](./USER.md)** |
| Run it locally, understand the architecture, or contribute | 💻 **[Developer Guide → DEVELOPER.md](./DEVELOPER.md)** |
| See what's shipped and what's next | 🚀 **[Roadmap → coming_soon.md](./coming_soon.md)** |
| See open design decisions | 🧭 **[Planning → planning.md](./planning.md)** |
| File an issue the right way | 🐛 **[CONTRIBUTING.md](./CONTRIBUTING.md)** |

---

## ⚡ Quick Start

```bash
cp .env.example .env.local          # add TMDB_API_KEY (+ DATABASE_URL for accounts)
cp .dev.vars.example .dev.vars      # add AUTH_SECRET (npx auth secret)
npm install
npm run db:push                     # only if you configured a database
npm run dev                         # http://localhost:3000
```

Accounts are entirely optional — the app is fully usable as a guest with no database at all.
Full setup notes are in [DEVELOPER.md](./DEVELOPER.md#️-getting-started).

---

## 🌟 Highlights

**Discovery**
- Auto-rotating hero, a seasonal themed strip, and a 🎭 mood picker that drops you into a
  pre-filtered Discover page.
- Trending, Popular, Top Rated, Now Playing / On Air, Coming Soon, Hidden Gems,
  Binge-Worthy TV, Returning Soon.
- **Top 10 in your country**, geo-detected.
- Provider hub for Netflix, Prime Video, Disney+, Apple TV+, Hulu and Peacock.
- A full filter engine — genre, country, language, year, rating, sort — with **saved
  filter presets** and infinite scroll everywhere.

**Watching**
- Up to 9 configurable streaming servers, badged by capability, switchable mid-session.
- Optional **ad-filtering proxy** (a separate Cloudflare Worker) that blocks pop-unders,
  ad networks and redirects — with a per-server bypass toggle.
- Auto-resume, and next-episode resolution derived from TMDB airing data, so it never
  sends you to an episode that hasn't aired.

**Your stuff**
- **Continue Watching** and a separate **New & Upcoming Episodes** rail — a title is always
  in exactly one of them.
- **My List** with folders, watched state, search, sort, and JSON export/import.
- **Profile dashboard** — watch time, completion rate, streaks, a 90-day activity timeline,
  top genres, top streamed titles, and a full searchable watch history.
- **Everything works signed out.** An account only adds cross-device sync, on top of the
  same local-first storage.

**Under the hood**
- TMDB key never reaches the browser — all client traffic goes through a server-side proxy,
  with log redaction as defence in depth.
- Local-first sync with debounced batching, `sendBeacon` flushes, tombstones and explicit
  conflict rules.
- Seven themes including true-black AMOLED, reduce-motion and data-saver modes, and an
  age-rating ceiling applied server-side.
- Installable PWA with offline fallback; native Android build via Capacitor.
- Server-side terms gate in middleware, with crawler passthrough for SEO.

---

*CinemaPhora — Elevating your viewing experience.*
