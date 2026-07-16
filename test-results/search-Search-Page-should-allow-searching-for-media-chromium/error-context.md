# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> Search Page >> should allow searching for media
- Location: tests/e2e/search.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder(/Search for movies, TV shows.../i).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder(/Search for movies, TV shows.../i).first()

```

```yaml
- navigation:
  - link "🎬 CinemaPhora":
    - /url: /
  - link "Home":
    - /url: /
  - link "Search":
    - /url: /search
  - link "My List":
    - /url: /wishlist
  - link "🔥 Trending":
    - /url: /trending
  - link "🎞️ Popular":
    - /url: /popular
  - link "⭐ Top Rated":
    - /url: /top-rated
  - link "🎬 Now Playing":
    - /url: /now-playing
  - link "🍿 Coming Soon":
    - /url: /upcoming
  - link "📺 Providers":
    - /url: /providers
  - link "🧭 Discover":
    - /url: /discover
  - textbox "Search movies, TV shows…"
  - button "Search": 🔍 /
  - link "Settings":
    - /url: /settings
    - text: ⚙️
- text: 🛑
- heading "Terms Declined" [level=1]
- paragraph: You must agree to the Terms of Use and Privacy Policy to use CinemaPhora. Because you declined, access to the application is restricted.
- link "Review Terms Again":
  - /url: /
- button "I Agree"
- contentinfo:
  - text: CinemaPhora Browse
  - link "Home":
    - /url: /
  - link "Trending":
    - /url: /trending
  - link "Popular":
    - /url: /popular
  - link "Top Rated":
    - /url: /top-rated
  - text: Discover
  - link "Now Playing":
    - /url: /now-playing
  - link "Coming Soon":
    - /url: /upcoming
  - link "Discover":
    - /url: /discover
  - link "Search":
    - /url: /search
  - text: Providers
  - link "All Providers":
    - /url: /providers
  - link "Netflix":
    - /url: /provider/8
  - link "Prime Video":
    - /url: /provider/9
  - link "Disney+":
    - /url: /provider/337
  - text: Legal
  - link "Terms of Use":
    - /url: /terms
  - link "Privacy Policy":
    - /url: /privacy
  - link "Settings":
    - /url: /settings
  - paragraph: Powered by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
  - text: © 2026 CinemaPhora. All rights reserved.
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Search Page', () => {
  4  |   test('should allow searching for media', async ({ page }) => {
  5  |     await page.goto('/search');
  6  |     
  7  |     const searchInput = page.getByPlaceholder(/Search for movies, TV shows.../i).first();
> 8  |     await expect(searchInput).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  9  | 
  10 |     // Type a search query
  11 |     await searchInput.fill('Inception');
  12 |     await page.waitForTimeout(1000); // Wait for debounce
  13 | 
  14 |     // Expect results to show up
  15 |     const results = page.locator('.media-card');
  16 |     await expect(results.first()).toBeVisible();
  17 |   });
  18 | });
  19 | 
```