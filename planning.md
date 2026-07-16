# Future Improvements & Planning 🚀
## 1. Server-Side Route Protection (Next.js Middleware)
Currently, our `RouteProtector` uses Client-Side validation (`localStorage`). This means the server renders and sends protected content before the client hides it and redirects. 

**The Plan:**
- Migrate from `localStorage` to **Cookies** for storing the `termsAccepted` flag.
- Implement **Next.js Middleware** (`middleware.ts`) to intercept requests before they even reach the page renderer.
- **Benefits:** 
  - Absolute security: Protected HTML/Data is never sent to unaccepted users.
  - Zero "flash of content" or layout shifts.
  - We can configure the Middleware to allow `Googlebot` user-agents through, preserving SEO rankings for movie details and discover pages while still blocking real human users who haven't agreed.

## 2. Deep Linking & Redirection Memory
Currently, if a user opens a direct link (e.g., `/details/1234`) without having accepted the terms, they are kicked to the `/declined` page and lose their original destination. 

**The Plan:**
- When the Middleware intercepts an unaccepted user on a protected route, it will append their intended destination as a query parameter (e.g., `/declined?redirect=/details/1234`).
- When the user clicks "I Agree", the system will read the `redirect` parameter and send them exactly where they originally intended to go, instead of blindly sending them to the Home page.
- **Benefits:** Massive improvement in User Experience, especially for users arriving from shared links or search engines.

## 3. Universal Cookie-Based Settings Store
As the application grows, more settings will be introduced (e.g., Default Streaming Provider, Subtitle Preferences, Theme). 

**The Plan:**
- We will store all core user preferences in Cookies rather than `localStorage`.
- **Benefits:** 
  - Because Cookies are sent to the server with every request, Next.js Server Components can read the user's preferences *before* rendering the HTML.
  - This prevents UI issues like "theme flashing" (where a page loads in light mode and suddenly snaps to dark mode when the client reads `localStorage`).
  - Provides a unified, server-accessible state management strategy that works perfectly with Next.js App Router architectures.

## 4. Settings Page Features & UX Vision
Based on our design session, we have defined the scope of what the user should be able to customize within the Settings page:

### Content & Personalization
- **Preferred Streaming Providers:** Allow users to select their favorite services (Netflix, Hulu, Max, etc.) so the app can prioritize showing where a movie is streaming based on what they actually subscribe to.
- **Region & Language:** Let users default the TMDB data to their specific region (e.g., US/English, ES/Spanish) for localized titles, posters, and release dates.
- **Safe Search (Adult Content Filter):** A toggle to strictly filter out adult/explicit content from search results and discover feeds.

### UI & User Experience
- **Theme Engine:** A robust toggle for Light Mode, Dark Mode, and System Default. (Powered by the Cookie-based settings store discussed above).
- **View Layouts:** Allow users to globally switch between a dense "Grid View" (posters only) and a detailed "List View" (posters + descriptions) for search results and feeds.

### Data Management & Privacy
- **Wishlist Export/Import:** Since the Wishlist is entirely local, provide a simple JSON export/import tool so users can back up their curated lists.
- **Clear All Data:** A master "factory reset" button to instantly wipe all local data, cached history, and agreements from the browser.

## 5. Additional Guest-Specific Quality-of-Life Settings
Since CinemaPhora operates without a backend user account system (everyone is effectively a local "guest"), giving users granular control over their local experience is essential for a premium feel:

### Accessibility & Visuals (A11y)
- **Reduce Motion:** A toggle to disable heavy animations, smooth scrolling, and parallax effects, drastically improving the experience for older devices or users with motion sensitivities.
- **High Contrast Mode / UI Scaling:** Allow users to bump up the contrast ratio or scale up text and poster sizes for better readability, particularly in the Capacitor mobile app.

### Media & Playback Defaults
- **Autoplay Trailers:** A toggle to decide if trailers on the details page should automatically start playing (and whether they start muted).
- **Data Saver Mode:** A toggle to prevent auto-fetching trailers and load lower-resolution posters to save bandwidth for users on cellular data.

### Search & Feed Management
- **Search History Control:** A toggle to opt-out of saving recent searches, plus a dedicated "Clear Recent Searches" button.
- **Hide "Watched" Items:** Allow users to mark Wishlist items as "Watched", and provide a global setting to hide these items from the Discover feed so they only see new recommendations.
- **Default Sort Orders:** Let users set a persistent default sort method (e.g., Alphabetical, Release Date, Highest Rated) for their Wishlist and Search Results.


