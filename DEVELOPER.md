# 💻 CinemaPhora — Developer Guide

Welcome to the CinemaPhora codebase! This document covers architecture, tech stack, code quality rules, and instructions for running and modifying the application.

## Table of Contents
- [Tech Stack](#-tech-stack)
- [Getting Started (Local Development)](#️-getting-started-local-development)
  - [Prerequisites](#1-prerequisites)
  - [Environment Variables](#2-environment-variables)
  - [Run via Docker (Recommended)](#3a-run-via-docker-recommended)
  - [Run via Node.js](#3b-run-via-nodejs)
- [Architecture & Core Concepts](#️-architecture--core-concepts)
- [Folder Structure](#-folder-structure)
- [Code Quality Rules](#-code-quality-rules)
- [Styling Guidelines](#-styling-guidelines)
- [Deployment](#-deployment)
  - [Docker (GHCR & Compose)](#docker-ghcr--compose)
  - [Cloudflare Workers](#cloudflare-workers)
- [Legal & Compliance](#️-legal--compliance)
- [Key TMDB Provider IDs](#-key-tmdb-provider-ids)

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Vanilla CSS Modules + Global CSS Variables (no Tailwind) |
| PWA | `@ducanh2912/next-pwa` with custom Workbox runtime caching |
| Native (Android) | [Capacitor](https://capacitorjs.com/) |
| Metadata / Discovery | [TMDB API v3 & v4](https://www.themoviedb.org/) |
| Video Embeds | Managed via `lib/streamingProvider.ts` and `lib/providers/` |
| Primary Deployment | [Cloudflare Workers](https://workers.cloudflare.com/) via `@opennextjs/cloudflare` |
| Alternate Deployment| **Docker** (Production Standalone)|

---

## ⚙️ Getting Started (Local Development)

### 1. Prerequisites
Ensure you have **Docker** and **Docker Compose** installed (recommended) or **Node.js v18+** and **npm**.

### 2. Environment Variables
1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and fill in your values:
   ```env
   # TMDB Authentication
   # We highly recommend using a TMDB v4 Read Access Token (JWT) here instead of a v3 API key. 
   # v4 tokens are sent securely via headers and prevent API key leaks in server logs.
   TMDB_API_KEY=your_v4_read_access_token_here

   # Streaming provider base URLs — only configure the servers you want active.
   NEXT_PUBLIC_MOVIESAPI_URL=
   NEXT_PUBLIC_PRIMESRC_URL=
   NEXT_PUBLIC_VIDLINK_URL=
   NEXT_PUBLIC_MULTIEMBED_URL=
   ```
   > `.env.local` is git-ignored. Your API key never reaches the client browser.

### 3a. Run via Docker (Recommended)
CinemaPhora provides a hot-reloading Docker setup for local development.

```bash
# Build and start the development container
docker compose up cinemaphora-development --build
```
Open [http://localhost:3000](http://localhost:3000). The container uses `WATCHPACK_POLL=true` to ensure hot-reloading works perfectly across host volumes.

### 3b. Run via Node.js
If you prefer running outside of Docker:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

> The PWA service worker is disabled in dev mode. To test PWA/offline features locally without Docker run `npm run build && npm run start`.

---

## 🏗️ Architecture & Core Concepts

### Secure API Proxy Layer
**The TMDB API key is never sent to the client browser.**

- **Server Components** call `tmdbFetch()` directly — it detects `typeof window === 'undefined'` and hits the TMDB API using server-side variables. It automatically handles both v4 Bearer tokens and legacy v3 query params.
- **Client Components** (infinite scroll, Top 10, etc.) call `/api/tmdb/[...path]`, a Next.js Route Handler that acts as a secure proxy and injects the API key server-side before contacting TMDB.
- See `app/api/tmdb/[...path]/route.ts` and `lib/tmdb.ts`.

### Homepage Data Strategy
All homepage rows are fetched in a single `Promise.allSettled()` on the server, so a failure in one row never blocks the rest. The `ok()` helper extracts results, returning `[]` on rejection — rows with no data simply don't render.

### Progress Tracking (Continue Watching)
`lib/progressTracker.ts` handles saving media watch progress to `localStorage`. The `ContinueWatchingRow` component reads this data to display partially watched content on the homepage.

### Route Architecture
Each content category now has its own purpose-built route so "See All →" links show exactly the same content as the homepage row:

| Route | Source | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Homepage — server-rendered rows |
| `/trending` | `app/trending/` | Full trending grid (`/trending/all/week`) |
| `/upcoming` | `app/upcoming/` | Movies & TV releasing in the next 3 months |
| `/now-playing` | `app/now-playing/` | Currently in theatres or on air |
| `/popular` | `app/popular/` | Top popular media |
| `/top-rated` | `app/top-rated/` | Highest rated media |
| `/providers` | `app/providers/` | Unified streaming providers hub |
| `/discover` | `app/discover/` | Generic filtered grid (genre, country, year, rating) |
| `/details/[id]` | `app/details/[id]/` | Movie / TV show detail page |
| `/watch/[id]` | `app/watch/[id]/` | Embedded video player |
| `/search` | `app/search/` | Multi-search with infinite scroll |
| `/person/[id]` | `app/person/[id]/` | Actor / crew filmography page |
| `/api/tmdb/[...path]` | `app/api/tmdb/` | Secure server-side TMDB proxy |

### Infinite Scroll Pattern
All discovery and grid pages (`/trending`, `/upcoming`, `/providers`, `/discover`, `/now-playing`, etc.) are powered by a single, highly re-usable `components/DiscoveryFeed.tsx` component.
- The server component (page) fetches page 1 and passes `initialItems` to the feed.
- `DiscoveryFeed.tsx` handles all subsequent pages via `IntersectionObserver`.
- The sentinel `<div>` is hidden when loading or when all pages are exhausted, preventing race conditions and "footer flash".

### Streaming Providers
`lib/streamingProvider.ts` and the `lib/providers/` directory handle video embedding. 
The `PlayerIframe` component orchestrates these providers and provides a seamless viewing experience with error fallback mechanisms and fullscreen delegation fixes natively supported.

---

## 📁 Folder Structure

```text
├── app/
│   ├── api/tmdb/[...path]/   # Secure TMDB proxy route handler
│   ├── details/[id]/         # Movie / TV show detail page
│   ├── discover/             # Generic filtered discovery grid
│   ├── now-playing/          # Currently in theatres / on air
│   ├── person/[id]/          # Actor / crew filmography
│   ├── popular/              # Top popular media
│   ├── providers/            # Unified platform-specific content (Netflix, Prime, etc.)
│   ├── search/               # Multi-search page
│   ├── top-rated/            # Highest rated media
│   ├── trending/             # Global trending grid (/trending/all/week)
│   ├── upcoming/             # Coming soon movies & TV (next 3 months)
│   ├── watch/[id]/           # Embedded video player
│   ├── layout.tsx            # Global HTML shell, Navbar & Footer
│   ├── loading.tsx           # Single global Suspense fallback loader
│   ├── page.tsx              # Home page — server-rendered rows
│   └── globals.css           # CSS variables, resets, utility classes
├── components/
│   ├── CapacitorInit.tsx     # Native back-button & fullscreen orientation (mobile)
│   ├── DetailsTabs.tsx       # Tabs UI (Watch / Trailers / Cast / Reviews)
│   ├── DiscoveryFeed.tsx     # Unified infinite scroll feed for all grids
│   ├── EpisodeSelector.tsx   # Season & episode picker for TV
│   ├── FilterBar.tsx         # Discover page filter controls
│   ├── Footer.tsx            # Global footer
│   ├── HeroBanner.tsx        # Auto-rotating hero carousel
│   ├── Loading.tsx           # Generic full-page loading indicator
│   ├── MediaCard.tsx         # Movie / TV poster card
│   ├── MediaRow.tsx          # Horizontal scrolling row with "See All" link
│   ├── Navbar.tsx            # Top navigation bar with search
│   ├── ProviderTabs.tsx      # Platform switcher tabs (Netflix, Prime, etc.)
│   ├── ScrollToTop.tsx       # Floating scroll-to-top button
│   └── Top10Row.tsx          # Geo-detected Top 10 rows (movie + TV)
├── lib/
│   ├── tmdb.ts               # TMDB types, fetch helpers, all API functions
│   └── streamingProvider.ts  # Streaming server URL builder
├── Dockerfile                # Production multi-stage build (Standalone)
├── Dockerfile.dev            # Local development container
└── public/                   # Static assets, PWA icons & manifest
```

---

## 📐 Code Quality Rules

These are self-imposed rules enforced across the entire codebase:

1. **No function definitions inside `useEffect`.**  
   Only function *calls* live inside `useEffect`. All logic is extracted into named module-level functions before the component.

2. **No God Components.**  
   Large server pages (e.g. `page.tsx`) only orchestrate data fetching and composition. Complex interactive logic lives in dedicated `*Client.tsx` siblings.

3. **No prop drilling.**  
   Data is fetched as close to the component that needs it as possible. Shared state lives in context or is co-located.

4. **Conditional sentinel rendering for infinite scroll.**  
   The `IntersectionObserver` sentinel is unmounted when all pages are loaded, preventing spurious callbacks.

5. **`Promise.allSettled` on the homepage.**  
   No single failing TMDB fetch can break the entire page.

---

## 🎨 Styling Guidelines

- All colours, spacing, and shadows are CSS variables in `app/globals.css` `:root`.
- When creating a new component `MyComponent.tsx`, always create a sibling `MyComponent.module.css`.
- **Do not use Tailwind CSS** unless explicitly requested.

---

## 🚀 Deployment

### Docker (GHCR & Compose)
CinemaPhora uses Next.js `output: "standalone"` to create a highly optimized production Docker image.

**Pulling the Pre-Built Image:**
The official production image is pushed to the GitHub Container Registry. You can run it anywhere using:
```bash
docker pull ghcr.io/peterkahumu/cinemaphora:prod

docker run -d -p 3000:3000 \
  --env-file .env.production \
  ghcr.io/peterkahumu/cinemaphora:prod
```

**Building Locally for Production:**
To build the production image yourself, use the included Compose target:
```bash
docker compose build cinemaphora-production
docker compose up cinemaphora-production -d
```
> Note: Ensure you have a `.env.production` file configured in your project root before running the production compose target.

### Cloudflare Workers
You can also deploy this project to **Cloudflare Workers** via `@opennextjs/cloudflare`.

```bash
# Preview locally with Cloudflare's runtime
npm run preview

# Deploy to Cloudflare
npm run deploy
```

Set the following environment variable in your Cloudflare Workers dashboard (or `wrangler.toml`):
- `TMDB_API_KEY` — your TMDB v4 Read Access Token (or v3 key)

---

## ⚖️ Legal & Compliance

CinemaPhora enforces a strict Terms of Use agreement due to its nature as an indexing service.

- **TermsAgreementModal**: A global modal injected in `app/layout.tsx` checks the `cinemaphora_terms` cookie (via `lib/terms.ts`).
- **Enforcement**: If the user has not accepted the terms, the modal blocks all interactions. The modal links to `/terms` and `/privacy`.
- **Settings Page**: Users can view their agreement status and revoke it at `/settings`. Revoking clears the flag and re-triggers the modal.
- **Capacitor (Android)**: The app relies on the WebView's native cookie handling. No special native storage plugins are required for the terms agreement check.

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

> Provider IDs are region-specific. The IDs above are for `watch_region=US`. Changing the region requires updating both `lib/tmdb.ts` (`getProviderContent`) and `components/ProviderTabs.tsx` (`PROVIDERS`).

## 🐛 Found an Issue?

Before creating an issue, please use our [Issue Selection Guide](https://github.com/peterkahumu/Cinestream/wiki/Issue-Selection-Guide) to determine the correct template.

**Quick Reference:**

| Situation | Template |
|-----------|----------|
| Something is broken | 🐛 Bug Fix |
| New feature request | ✨ Enhancement |
| Idea or suggestion | 💡 Recommendation |
| Everything else | 📄 General |