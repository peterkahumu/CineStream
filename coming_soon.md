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

### Idea 1: The "Cinematic Flex" (Quickest Win)
Instead of a rigid grid, we switch the Trailers and Seasons to a flexible layout that intelligently scales based on how many items exist.
- If there's **1 trailer**, it expands to a beautiful cinematic width (capped at ~800px) and centers itself.
- If there are **2 trailers**, they split the screen beautifully 50/50.
- If there are **3+ trailers**, they wrap into a nice uniform row.
*(This prevents the awkward empty white space on the right while preventing a single trailer from becoming a gigantic wall).*

### Idea 2: The "Premium Sidebar" Layout (Most Dynamic)
On ultra-wide displays, scrolling vertically through full-width sections (Trailers -> Seasons -> Cast -> Reviews -> Recommendations) leaves a lot of wasted horizontal space. We can switch to a modern **Two-Column Dashboard** layout just for desktop screens (`min-width: 1200px`):

- **Left Column (70% width):** Your core content. Trailers, Seasons, and Reviews. These elements look great when they have room to breathe, but capping them at ~1100px keeps them readable.
- **Right Column (30% width, Sticky):** A sleek, sticky sidebar containing the **Cast** (as a compact list) and **Recommendations**. As the user scrolls down the trailers and seasons, the Cast and Recommendations stay pinned on the right side of the screen. 

