# Future Improvements & Planning 🚀

## ✅ Shipped: Server-Side Route Protection & Deep-Link Memory
Items #1 and #2 below (as originally planned) are now live in `middleware.ts`:
- The `cinemaphora_terms` flag is a **cookie**, not `localStorage`, so it's readable server-side.
- **Next.js Middleware** intercepts every request before the page renders — unaccepted users never receive protected HTML/data, with zero flash-of-content, and `Googlebot`/other crawler user-agents pass through untouched for SEO.
- Unaccepted users on a protected route are redirected to `/declined?redirect=<original-path>`, and accepting terms sends them back to exactly where they were headed.

<details>
<summary>Original plan (for reference)</summary>

### 1. Server-Side Route Protection (Next.js Middleware)
Currently, our `RouteProtector` uses Client-Side validation (`localStorage`). This means the server renders and sends protected content before the client hides it and redirects. 

**The Plan:**
- Migrate from `localStorage` to **Cookies** for storing the `termsAccepted` flag.
- Implement **Next.js Middleware** (`middleware.ts`) to intercept requests before they even reach the page renderer.
- **Benefits:** 
  - Absolute security: Protected HTML/Data is never sent to unaccepted users.
  - Zero "flash of content" or layout shifts.
  - We can configure the Middleware to allow `Googlebot` user-agents through, preserving SEO rankings for movie details and discover pages while still blocking real human users who haven't agreed.

### 2. Deep Linking & Redirection Memory
Currently, if a user opens a direct link (e.g., `/details/1234`) without having accepted the terms, they are kicked to the `/declined` page and lose their original destination. 

**The Plan:**
- When the Middleware intercepts an unaccepted user on a protected route, it will append their intended destination as a query parameter (e.g., `/declined?redirect=/details/1234`).
- When the user clicks "I Agree", the system will read the `redirect` parameter and send them exactly where they originally intended to go, instead of blindly sending them to the Home page.
- **Benefits:** Massive improvement in User Experience, especially for users arriving from shared links or search engines.

</details>

## ✅ Shipped (partially): Settings Sync
Item #3 below originally proposed a *cookie-based* store so Server Components could read preferences pre-render. We now have the sync half of that story: signed-in users' settings sync to Postgres (latest-change-wins, same pattern as watch progress) so preferences carry across devices — see `lib/settings.ts` and `/api/get-settings` · `/api/sync-settings`. Guests remain cookie-only, unchanged. **Still open:** Server Components don't yet read the settings cookies to pre-render theme/layout server-side (see item 3's original benefits below) — the `theme-init` inline script in `app/layout.tsx` still applies theme client-side just before paint to avoid flashing.

## 3. Universal Cookie-Based Settings Store
As the application grows, more settings will be introduced (e.g., Default Streaming Provider, Subtitle Preferences, Theme). 

**The Plan:**
- We will store all core user preferences in Cookies rather than `localStorage`.
- **Benefits:** 
  - Because Cookies are sent to the server with every request, Next.js Server Components can read the user's preferences *before* rendering the HTML.
  - This prevents UI issues like "theme flashing" (where a page loads in light mode and suddenly snaps to dark mode when the client reads `localStorage`).
  - Provides a unified, server-accessible state management strategy that works perfectly with Next.js App Router architectures.

## 4 & 5. Settings Page Features & UX Vision — ✅ mostly shipped
Everything below except **Hide "Watched" Items** and **High Contrast Mode / UI Scaling**
now ships in `/settings` (`app/settings/SettingsClient.tsx`), available to guests and
signed-in users alike, with signed-in users additionally getting it synced across
devices (see the Settings Sync note above). The "guest-only" framing this section
originally had is stale — accounts exist now; guests just don't get the DB sync.

### Content & Personalization
- ✅ **Preferred Streaming Providers**, **Region & Language**, **Safe Search** (plus an
  **Age Rating Ceiling** control that wasn't in the original scope).

### UI & User Experience
- ✅ **Theme Engine:** Light / Dark / System, plus three extra themes (Cinema, AMOLED, Dim).
- ✅ **View Layouts:** Grid / List toggle.
- [ ] **High Contrast Mode / UI Scaling** — still not implemented.

### Data Management & Privacy
- ✅ **Wishlist Export/Import**, **Clear All Data**.

### Accessibility & Visuals (A11y)
- ✅ **Reduce Motion**.

### Media & Playback Defaults
- ✅ **Autoplay Trailers**, **Data Saver Mode**.

### Search & Feed Management
- ✅ **Search History Control**, **Default Sort Orders**.
- [ ] **Hide "Watched" Items** — still not implemented.


