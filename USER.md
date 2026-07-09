# 🍿 CinemaPhora — User Guide

Welcome to CinemaPhora! This guide will help you navigate the platform and get the most out of your movie and TV show experience.

---

## ✨ Features

### 1. Home Page
When you first land on CinemaPhora you are greeted with a dynamic home page.

- **Hero Banner:** Auto-rotating carousel of top trending content with smooth fade transitions.
- **Trending This Week:** What the world is watching right now. Click "See All →" to browse the full trending grid.
- **Top 10 in Your Country:** The 10 most popular movies and TV shows in your region, detected automatically from your IP. Your location is shown briefly as a pill at the top (auto-dismisses). If detection fails this row is hidden.
- **Now Playing / Currently On Air:** Movies in theatres and TV shows actively airing right now.
- **Streaming Platform Rows:** Dedicated sections for **Netflix**, **Prime Video**, and **Disney+**, showing the latest releases from the last 6 months on each platform.
- **Popular, Top Rated:** Browse what audiences love most.
- **Upcoming Movies & TV Shows:** Titles releasing in the next 3 months. Click "See All →" to open the dedicated Coming Soon page.

### 2. Coming Soon
Click **"See All →"** on either Upcoming row, or navigate directly to `/upcoming`.

- Switches between movies and TV shows using the toggle at the top.
- Loads more titles as you scroll (infinite scroll).
- Titles shown match exactly what's on the homepage row.

### 3. Trending
Click **"See All →"** on the Trending row, or navigate directly to `/trending`.

- Filter between All, Movies, and TV Shows using the tabs at the top.
- Infinite scroll through the week's global trending content.

### 4. Provider Pages (Netflix / Prime Video / Disney+)
Click **"See All →"** on any platform row.

- Shows all movies or TV shows from that platform released in the last 6 months.
- Toggle between Movies and TV Shows at the top.
- Infinite scroll for deeper browsing.

### 5. Discover
Click **Discover** in the top navigation bar to access the full filtering engine.

- **Filter by Media:** Toggle between Movies and TV Shows.
- **Refine:** Narrow by Genre, Country of Origin, Release Year, and Minimum Rating.
- **Sort:** By Popularity, Release Date, Rating, or Title.
- Results load more automatically as you scroll.

### 6. Instant Search
Click **Search** in the navigation bar.

- Results update dynamically as you type (300ms debounce).
- Filter results to *All*, *Movies*, or *TV Shows* using the tabs below the search bar.
- Infinite scroll loads additional pages automatically.

### 7. Details Page
Click any title card to open its detail page.

- **Hero:** Backdrop art, rating chip, runtime/seasons count, and status badge.
- **"Coming on [date]":** For upcoming movies or TV shows with a known air date, the Watch button is replaced with a date label so you know when to come back.
- **Watch / View Episodes:** For available content, jump straight to the player. TV shows open an episode selector tab.
- **Tabs:** *Watch* (TV only, hidden for upcoming shows), *Trailers*, *Cast*, *Reviews*.
- **Recommendations & Similar:** Scroll down to discover more titles you might enjoy.

### 8. Watch Page
- **Cinematic player:** Edge-to-edge video player.
- **Multiple Servers:** If one server fails to load, switch using the server buttons below the player.
- **🎬 Lights Out:** Click to dim the surrounding UI for a focused viewing experience.
- **TV Episode Navigation:** Season/episode selector to jump between episodes.

### 9. Actor / Person Pages
Click any cast member on a details page to see their full filmography and biography.

### 10. Installable App (PWA)
CinemaPhora is a Progressive Web App — install it directly to your device from the browser.

- **How to Install:** In Chrome/Edge look for the install icon in the URL bar, or use *Add to Home Screen* in your browser menu.
- **Benefits:** Launches in full-screen native mode. Images and data are cached locally for instant loads even on a slow connection.

### 11. Legal & Settings
When you first open CinemaPhora, you will be prompted to agree to our Terms of Use and Privacy Policy. This is required because CinemaPhora acts as a search engine for third-party streams.
- **Settings:** You can view your agreement status or revoke it at any time by clicking "Settings" in the footer, or navigating to `/settings`.

---

## 🛠️ Troubleshooting

**The video player isn't loading!**
- Give it a few seconds — the player fetches the highest quality stream available.
- Try disabling strict tracking prevention in your browser; it can sometimes block the third-party video embed.
- Switch to a different server using the buttons below the player.

**Why does my mouse disappear when watching a video?**
- This is intentional. The player hides the cursor and controls after a few seconds of inactivity for an immersive experience. Wiggle your mouse to bring them back.

**The Top 10 row is not showing.**
- This row requires a geo-location lookup. If your network blocks the geo service, or if the lookup fails, the row is hidden automatically.

**I'm seeing a warning about a missing API key.**
- The server hasn't been configured properly. Contact the site administrator to ensure `TMDB_API_KEY` is set.

---

Enjoy the show! 🍿
