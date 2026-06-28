# 🚀 Coming Soon: CinemaPhora Features

Here is a roadmap of upcoming features for CinemaPhora based on our recent brainstorming sessions.

## Personalization & State (The "Netflix" Experience)
- [ ] **"Continue Watching" Row:** Track viewing progress and surface incomplete episodes/movies on the Home Page.
- [ ] **Watchlists & Favorites:** Allow users to save titles for later (initially via `localStorage`).
- [ ] **Watch History:** A dedicated tab showing previously watched content.

## Immersive UX & Content Enhancements
- [ ] **Auto-playing Trailers:** Silently auto-play trailers in the background on the Home Page or Watch Page.
- [ ] **Next Episode Auto-Play:** 10-second countdown to the next TV episode.
- [ ] **Dedicated Actor/Director Pages:** Clickable cast lists leading to full filmography and biographies.
- [ ] **Skeleton Loaders:** Replace generic loading spinners with animated Skeleton UI cards.

## Advanced Player Controls
- [ ] **Picture-in-Picture (PiP):** Pop-out floating video window.
- [ ] **Theatre Mode / Lights Out:** Dim the surrounding UI for focused viewing.
- [ ] **Keyboard Shortcuts:** Standard media controls (Space to pause, F for fullscreen, etc.).

## Technical & Platform Upgrades
- [x] **Realtime Search:** The search page now updates results dynamically as you type.
- [ ] **True OLED Dark Mode:** "True Black" theme for battery saving and low-light viewing.
- [ ] **Dynamic Open Graph (SEO):** Rich previews when sharing links on social media and messaging apps.
- [ ] **Offline Downloads:** Caching/downloading media for offline viewing (Capacitor/Android).

# Brainstorming 2

**1. The "Binge-Watcher" Episode Selector (You mentioned this earlier!)**
Right now, watching a TV show requires manually entering the season and episode. We have all the season data now, so we could build a sleek sidebar (or dropdown) on the `/watch` page that lists all seasons and episodes. Users could just click an episode and immediately start watching, just like Netflix.

**2. A "Theater Mode" or "Lights Out" Toggle**
When a user is on the watch page, we could add a toggle that dims the rest of the UI (or makes it completely black) so the embedded video player pops out, creating a true cinematic experience.

**3. Homepage Hero Carousel**
Instead of showing just one movie in the hero banner on the homepage, we could build an auto-rotating carousel that cycles through the top 3-5 trending movies of the week, with smooth fade transitions and clickable indicator dots.

**4. "My List" / Watchlist (Local Storage)**
We could add a simple "Bookmark" or "Add to List" button on the details page. We can save this list to the user's browser (using `localStorage`) and create a dedicated `/watchlist` page where they can see all the movies and shows they plan to watch.

