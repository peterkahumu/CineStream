# 💻 CinemaPhora — Developer Guide

Welcome to the CinemaPhora codebase! This document outlines the architecture, tech stack, and instructions for running and modifying the application.

## 🚀 Tech Stack
* **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
* **Language:** TypeScript
* **Styling:** Vanilla CSS Modules (`.module.css`) + Global CSS Variables (No Tailwind)
* **Metadata API:** [The Movie Database (TMDB)](https://www.themoviedb.org/)
* **Video Provider:** Configurable iframe provider via `STREAMING_PROVIDER` and `lib/streamingProvider.ts`

---

## ⚙️ Getting Started

### 1. Prerequisites
Ensure you have `Node.js` (v18+) and `npm` installed.

### 2. Environment Variables
To fetch data and load watch embeds, you need a TMDB API Key and a streaming provider host.
1. Create an account at [TMDB](https://www.themoviedb.org/).
2. Generate an API Key in your account settings.
3. In the root of the project, copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
4. Open `.env.local` and add your key:
   ```env
   TMDB_API_KEY=your_v3_api_key_here
   STREAMING_PROVIDER=your-streaming-provider.example.com
   ```
   `STREAMING_PROVIDER` should be the hostname only, without `https://`.
   *(Note: `.env.local` is ignored by Git to keep your secrets safe).*

### 3. Run the Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Architecture & Security

### Secure API Proxy Layer
For security, **the TMDB API key is never exposed to the client browser**. 
Instead of making requests directly from React components to TMDB, the client calls a Next.js Server Route Handler:
* **Proxy Route:** `app/api/tmdb/[...path]/route.ts`
* The Route Handler securely attaches the `TMDB_API_KEY` from `process.env` and forwards the request to TMDB.
* It also handles caching (`Cache-Control`) to minimize API quota usage.
* **Client Fetcher:** `lib/tmdb.ts` automatically formats requests to point to `/api/tmdb/...` instead of the public internet.

### Ad-Free Video Integration
The watch page builds its iframe URL from `STREAMING_PROVIDER` in `lib/streamingProvider.ts`. That keeps the embed target configurable per environment and avoids hardcoding provider-specific hostnames in the client.

---

## 🎨 Styling Guidelines

We use a custom, minimalist design system utilizing CSS Modules. 
**Do not use Tailwind CSS unless explicitly requested.**

### Design Tokens (`app/globals.css`)
All colors, spacing, shadows, and responsive max-widths are defined as CSS variables in `:root`. 
* **Palette:** Base Slate (`#f8fafc`), Surface White (`#ffffff`), Navy Nav (`#0f172a`), Accent Blue (`#2563eb`), and Success Green (`#16a34a`).
* **Layout:** The global `--max-w` is set to `1600px` to comfortably fill large desktop monitors and eliminate negative space on the Watch pages.

### Component Styling
When creating a new component (e.g., `MyComponent.tsx`), always create a sibling CSS file (`MyComponent.module.css`). 
```tsx
import styles from './MyComponent.module.css';

export default function MyComponent() {
  return <div className={styles.container}>...</div>
}
```

---

## 📁 Folder Structure

```text
├── app/
│   ├── api/tmdb/[...path]/  # Secure server-side proxy for TMDB
│   ├── discover/            # /discover page
│   ├── search/              # /search page
│   ├── watch/[id]/          # /watch page (Dynamic route)
│   ├── layout.tsx           # Global HTML layout, Navbar & Footer inclusion
│   ├── page.tsx             # Home page (Hero, Media Rows)
│   └── globals.css          # CSS Variables, resets, and utility classes
├── components/
│   ├── ApiKeyModal.tsx      # Modal for entering TMDB API key
│   ├── EpisodeSelector.tsx  # Sidebar for selecting TV episodes
│   ├── FilterBar.tsx        # Discovery filtering UI
│   ├── Footer.tsx           # Global footer
│   ├── HeroBanner.tsx       # Homepage top banner
│   ├── LoadingSpinner.tsx   # Generic loading indicator
│   ├── MediaCard.tsx        # Movie/TV poster cards
│   ├── MediaRow.tsx         # Horizontal scrolling rows
│   └── Navbar.tsx           # Top navigation bar
├── hooks/
│   └── useApiKey.ts         # Custom hook for managing TMDB API key
├── lib/
│   ├── tmdb.ts              # API types and fetch helper functions
│   └── streamingProvider.ts # Video iframe URL generator
└── public/                  # Static assets
```

---

## 🚀 Deployment

The easiest way to deploy this Next.js app is using [Vercel](https://vercel.com/new).
1. Push your code to GitHub.
2. Import the repository into Vercel.
3. In the Vercel Environment Variables configuration, add:
   * Key: `TMDB_API_KEY`
   * Value: `your_v3_api_key_here`
   * Key: `STREAMING_PROVIDER`
   * Value: your streaming provider hostname
4. Deploy! Next.js App Router API Routes work seamlessly out of the box on Vercel.
