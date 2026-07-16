# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: details.spec.ts >> Details Page >> should load details page for a movie
- Location: tests/e2e/details.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Cast').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Cast').first()

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
  3  | test.describe('Details Page', () => {
  4  |   test('should load details page for a movie', async ({ page }) => {
  5  |     // Navigating to Inception (id: 27205)
  6  |     await page.goto('/details/27205?type=movie');
  7  |     
  8  |     // Check title exists
  9  |     await expect(page.locator('h1')).toBeVisible();
  10 | 
  11 |     // Check tabs
> 12 |     await expect(page.locator('text=Cast').first()).toBeVisible();
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  13 |     await expect(page.locator('text=Reviews').first()).toBeVisible();
  14 |   });
  15 | });
  16 | 
```