# 🍿 CinemaPhora — User Guide

Welcome to CinemaPhora! This guide covers everything you can do in the app — browsing,
searching, watching, saving, and keeping your progress in sync across devices.

> **Developer?** You want [DEVELOPER.md](./DEVELOPER.md) instead.

---

## Table of Contents

- [Getting Started](#-getting-started)
- [Home Page](#1-home-page)
- [Browsing & Discovery](#2-browsing--discovery)
- [Search](#3-search)
- [Details Page](#4-details-page)
- [Watch Page](#5-watch-page)
- [Continue Watching & New Episodes](#6-continue-watching--new-episodes)
- [My List (Wishlist)](#7-my-list-wishlist)
- [Accounts & Your Profile](#8-accounts--your-profile)
- [Settings](#9-settings)
- [Install as an App (PWA & Android)](#10-install-as-an-app-pwa--android)
- [Offline Mode](#11-offline-mode)
- [Troubleshooting](#-troubleshooting)
- [Privacy & Legal in Plain English](#-privacy--legal-in-plain-english)

---

## 🚀 Getting Started

The first time you open CinemaPhora you'll be asked to agree to the **Terms of Use** and
**Privacy Policy**. This is required — CinemaPhora is an index/search engine over
third-party streams, not a content host, so the agreement isn't optional. Until you accept,
every page except the home page, `/terms`, `/privacy` and the offline page will bounce you
to a "Terms Declined" screen. Accept from there and you land on exactly the page you were
originally trying to reach.

**You do not need an account.** Everything below works as a guest, stored on your device.
Signing in only adds cross-device sync on top.

---

## 1. Home Page

- **Hero Carousel** — auto-rotating banner of top trending backdrops with fade transitions
  and indicator dots.
- **Seasonal / Themed Strip** — a compact strip under the hero that changes with the
  calendar: 🎃 Spooky Season Picks in October, 🎄 Holiday Warmth in December,
  💖 Valentine's Romance in February, 💥 Weekend Action on Fri/Sat, 😂 Sunday Laughs on
  Sunday, and 🌟 Editor's Picks the rest of the time.
- **🎭 "What are you in the mood for?"** — opens the Mood Picker: twelve moods (Feel-Good,
  Edge of Seat, Let It Out, LOL, Mind-Bending, Romance, Action Rush, Family Night, World
  Cinema, Crime & Mystery, Chill & Slow, Epic Adventure) that drop you into a pre-filtered
  Discover page.
- **Continue Watching** — anything you're partway through. See
  [section 6](#6-continue-watching--new-episodes).
- **New & Upcoming Episodes** — shows you follow that have moved on without you.
- **Trending This Week** — what the world is watching.
- **Now Playing / Currently On Air** — movies in theatres, TV actively airing.
- **Top 10 in Your Country** — the 10 most popular movies and TV shows in your region,
  detected from your IP. Your location shows briefly as a pill, then auto-dismisses. If the
  lookup fails, the rows are hidden rather than showing something wrong.
- **💎 Hidden Gems** — highly rated but low-profile titles, movies and TV mixed.
- **📺 Binge-Worthy TV** and **🔜 Returning Soon**.
- **Streaming Platform Rows** — Netflix, Prime Video and Disney+, movies and TV each,
  showing releases from the last 6 months.
- **Popular**, **Coming Soon**, and **Top Rated** rows for movies and TV.

Every row's **"See All →"** link goes to a page showing *exactly* that row's content — no
generic fallback.

---

## 2. Browsing & Discovery

### Category pages

| Page | What's on it |
|---|---|
| **Trending** (`/trending`) | The week's global trending list |
| **Popular** (`/popular`) | Most popular movies and TV |
| **Top Rated** (`/top-rated`) | Highest rated titles |
| **Now Playing** (`/now-playing`) | In theatres now / currently on air |
| **Coming Soon** (`/upcoming`) | Releasing in the next 3 months |
| **Providers** (`/providers`) | Netflix, Prime Video, Disney+, Apple TV+, Hulu, Peacock |
| **Discover** (`/discover`) | The full filtering engine |

All of them share the same behaviour: a Movies / TV / All toggle, a filter bar, and
**infinite scroll** — more titles load as you reach the bottom.

### Filters (on every grid page)

- **Sort by** — Most Popular, Highest Rated, Newest First, Oldest First, Top Revenue,
  Most Voted.
- **Genre** — multi-select.
- **Country of origin** — multi-select.
- **Language** — multi-select.
- **Year** and **Minimum Rating** (5+ through 9+ ⭐).
- **💾 Save Preset / 📂 Load Preset** — name a filter combination ("My Friday Night") and
  recall it later. Presets are stored on your device.
- **✕ Reset Filters** clears everything at once.

### Provider pages

On `/providers`, tab between **Netflix, Prime Video, Disney+, Apple TV+, Hulu and Peacock**.
Each shows that platform's releases from the last 6 months, filterable and infinite-scrolling
like any other grid.

---

## 3. Search

Two ways in:

- **The search box in the top bar** (desktop) or the **mobile header search**. Results
  preview live as you type (300 ms debounce), showing up to 5 posters with type and year.
  Press <kbd>/</kbd> anywhere to jump straight into the search box, <kbd>Esc</kbd> to close.
- **The full search page** (`/search`) — filter results to *All*, *Movies* or *TV Shows*,
  with infinite scroll.

**Recent searches** appear when the box is empty and you have history saved. You can turn
history off, or clear it, in Settings → Search & Feed / Data Management.

---

## 4. Details Page

Click any poster to open its detail page.

- **Hero** — backdrop art, rating, runtime or season count, certification (age rating) and
  status badge. A **📚 "Part of the …"** badge appears for titles in a collection.
- **Breadcrumbs** — Home → Movies/TV Shows → Title.
- **Watch / View Episodes** — for available titles. For TV this drops you on the Watch tab
  with the episode list.
- **"Coming on [date]"** — for a movie with a future release date, or a TV show that hasn't
  premiered, the Watch button is replaced with the date so you know when to come back. The
  Watch tab is hidden entirely for shows with nothing to stream yet.
- **Add to My List** and **Share** buttons.
- **Tabs:**
  - **Watch** (TV only) — season picker and full episode list.
  - **Trailers** — YouTube trailers. For multi-season shows, the most recent seasons'
    trailers are pulled individually, falling back to the series trailer.
  - **Cast** — up to 12 credited actors; click any of them for their filmography.
  - **Reviews** — TMDB user reviews.
  - **Where to Watch** — legal stream / rent / buy availability for your region, falling
    back to US listings when your region has none.
- **More from the Director / Creator**, **Recommendations** and **Similar** rows below.

---

## 5. Watch Page

- **Cinematic player** — edge-to-edge embedded video.
- **Multiple servers** — up to 9 can be configured. Switch with the buttons below the
  player if one fails or buffers. Each is badged:
  - **⚡ Advanced** — progress tracking and auto-resume work on this server.
  - **Basic** — plain embed; progress is *not* tracked here.
  - The line under the buttons tells you exactly what the current server supports.
- **🛡️ Filter / ⚡ Direct toggle** — when an ad-filtering proxy is configured, streams are
  routed through it by default (blocking pop-unders, redirects and ad networks). Hit
  **⚡ Direct** if a specific server misbehaves through the filter, and **🛡️ Filter** to go
  back.
- **Episode navigation (TV)** — ← Prev / Next → buttons. The Next button only appears when
  there genuinely is a next *aired* episode — so it never sends you to something that
  can't play.
- **Auto-resume** — on an advanced server, playback picks up where you left off, on this
  device or any other device you're signed in on.
- **Mobile / Android** — going fullscreen rotates to landscape and hides the status bar
  automatically; leaving fullscreen restores it.

---

## 6. Continue Watching & New Episodes

These are two separate rails, and a title is only ever in one of them.

### ⏱️ Continue Watching
Things you can press play on **right now**: a partly-watched movie, or a TV show with an
aired, unwatched next episode. Each card shows the poster, a progress bar, `S1 E4`, and
`12m left`.

- Finish an episode and the card automatically advances to the next one.
- Finish a movie, or the series finale, and the card retires itself.
- **Removing a card** (the × on the card) only hides it from this row — **your watch time,
  history and stats are kept**. The confirmation dialog says as much.

### 📡 New & Upcoming Episodes
Where a series goes once you're caught up:

- **"New • S3 E1"** — an episode aired that you haven't seen. If several dropped at once
  it says "3 new".
- **"S3 E1 • Friday"** — you're up to date, and the next episode has a confirmed air date
  (shown as Today / Tomorrow / weekday / date, within the next ~4 months).

A show you finished months ago quietly reappears here when it comes back — including shows
you removed from Continue Watching, which return only once something genuinely new airs.

---

## 7. My List (Wishlist)

Reachable from the navbar, the mobile bottom bar, or `/wishlist`.

- **Add** any title from its details page.
- **Tabs** — All, To Watch, Watched, plus one tab per folder you create.
- **📁 Folders** — create named folders ("Date Night", "Documentaries"), file titles into
  them, and delete a folder later without losing its titles.
- **Mark as watched** — moves a title to the Watched tab.
- **Search and sort** — search within your list; sort by newest, oldest, or title A→Z.
- **At-a-glance stats** — how many titles are waiting, and a rough estimate of how many
  hours that is.
- **Export / Import** — Settings → Data Management downloads your list as JSON and restores
  it from a file.

Signed in, your list syncs across devices. As a guest it lives on that one browser.

---

## 8. Accounts & Your Profile

Creating an account (`/register`) is optional. Email and a password of at least 6
characters is all it takes.

**What an account adds:** everything below syncs across every device you sign in on —
watch progress, watch history, My List, and settings. Start a film on your phone, finish it
on your laptop. Guests keep all the same features, just confined to one browser.

Your profile (`/profile`) has three tabs:

### 📊 Overview & Stats
- **Titles Watched**, plus how many were active this month.
- **Total Watch Time**, formatted in days/hours/minutes.
- **Movies / TV Shows** split with a ratio bar and episode count.
- **Completion Rate** — the share of started movies and episodes you got to 90%+.
- **Momentum** — your current daily watching streak, or titles in the last 7 days.
- **🏆 Top Streamed** — your five biggest titles by watch time.
- **📈 Viewing Activity** — a timeline of the last 90 days, filterable by range.
- **🍩 Top Genres** — donut chart, filterable to 7 days / 30 days / month-to-date /
  90 days / all time.
- **Movies vs TV breakdown** and an insights ribbon (top binge, average episode length,
  total events logged).
- **🔄 Refresh Stats** forces a fresh read from the database.

### 🕘 Watch History
Every movie and episode you've started or finished. Search it, filter by All / Movies /
TV / Completed / Started, and page through it. Each entry links straight back to where you
were. History is the durable record — it survives removing something from Continue Watching.

### ⚙️ Account Management
- **Change password** (requires your current one).
- **Delete account** — permanently removes your account and every synced row: progress,
  history, list and settings. Requires your password to confirm, and cannot be undone.

Click your name at the top of the page to set or edit a **display name**.

---

## 9. Settings

`/settings` — open to **everyone**, signed in or not. From the footer, the ⚙️ in the top bar,
or the Settings tab in the mobile bottom bar. Signed in, changes sync to your other devices;
as a guest they stay on this one.

**🎨 Appearance**
- **Theme** — ☀️ Light, ☕ Warm, 🌙 Dark, 💻 System, 🍿 Cinema, ⬛ AMOLED (true black),
  🌑 Dim.
- **Reduce Motion** — turns off animations and transitions.

**🎬 Playback & Data**
- **Autoplay Trailers** on the details page.
- **Data Saver** — lighter imagery and fewer heavy loads.

**🧭 Content & Discovery**
- **Safe Search** — excludes adult results.
- **Age Rating Ceiling** — hide anything above G / PG / PG-13 / R / NC-17. Applied
  server-side to discovery results, so filtered titles never reach your browser.
- **Region** — affects release dates and which streaming providers are shown. Auto-detected
  on first visit; you can change it any time.
- **Language** — preferred language for titles and descriptions.

**🔍 Search & Feed**
- **Save Search History** on/off.
- **Default View Layout** — Grid or List.
- **Default Wishlist Sort**.

**💾 Data Management**
- **Export Wishlist** to JSON · **Import Wishlist** from a file · **Clear Search History**.

**📜 Legal & Compliance**
- See whether you've accepted the terms, and **revoke** your agreement (which immediately
  re-triggers the agreement prompt).

**⚠️ Danger Zone**
- **Clear All Data** — wipes your list, search history, settings and terms agreement from
  *this device*. If you're signed in this does not delete your account; use
  Profile → Account Management for that.

---

## 10. Install as an App (PWA & Android)

CinemaPhora is a Progressive Web App.

- **Chrome / Edge desktop** — click the install icon in the address bar.
- **iOS Safari** — Share → *Add to Home Screen*.
- **Android Chrome** — menu → *Install app* / *Add to Home Screen*.

Installed, it launches full-screen with no browser chrome, and posters and data are cached
for instant loads on a slow connection.

There is also a **native Android build** (Capacitor) with native back-button handling,
splash screen, status-bar theming and automatic landscape rotation in fullscreen.

---

## 11. Offline Mode

Lose your connection and CinemaPhora shows a "You are offline" screen with a
**🔄 Try Reconnecting** button and a shortcut to your wishlist. Previously viewed posters
and pages stay available from the cache. Streaming itself, of course, needs a connection.

---

## 🛠️ Troubleshooting

**The video player isn't loading.**
Give it a few seconds — the player negotiates the best available stream. Then try, in order:
switch to a different server below the player; toggle **⚡ Direct** to bypass the ad filter;
disable strict tracking prevention in your browser, which can block third-party embeds.

**My progress isn't being saved.**
Check the badge on the server you're using. **Basic** servers don't report playback position,
so nothing can be tracked on them — switch to one marked **⚡**.

**I finished an episode but Continue Watching didn't move on.**
It resolves the next episode from TMDB's airing data on the next load. If you're caught up,
the show moves to **New & Upcoming Episodes** instead — that's intentional, not a bug.

**The Top 10 row isn't showing.**
It needs a geo-IP lookup. If your network or an extension blocks the geo service, the row
hides itself rather than guessing.

**My stats look low / a title disappeared from my stats.**
Removing a title from **Continue Watching** keeps its hours. Using **Clear All Data** in
Settings, or deleting your account, does not — those are permanent.

**Settings changed on my phone didn't appear on my laptop.**
Sync only runs for signed-in users, and pushes a few seconds after the change. Reload the
other device once.

**I'm seeing a warning about a missing API key.**
The server isn't configured. Contact whoever is running the site — `TMDB_API_KEY` needs to
be set.

---

## 🔒 Privacy & Legal in Plain English

- CinemaPhora **does not host any video**. It indexes metadata from TMDB and embeds
  third-party players.
- As a guest, your progress, list, search history and settings live in your browser's
  local storage and cookies — nowhere else.
- Signed in, those same things are stored against your account so they can sync. Nothing
  else is collected.
- Deleting your account removes all of it.
- Full terms at [`/terms`](/terms), privacy policy at [`/privacy`](/privacy).

---

Enjoy the show! 🍿
