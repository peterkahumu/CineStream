# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: providers.spec.ts >> Providers Page >> should load providers page and allow tab switching
- Location: tests/e2e/providers.spec.ts:4:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /with_watch_providers=9/
Received string:  "http://localhost:3000/declined?redirect=%2Fprovider%2F9"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    2 × unexpected value "http://localhost:3000/declined?redirect=%2Fproviders"
    12 × unexpected value "http://localhost:3000/declined?redirect=%2Fprovider%2F9"

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
  3  | test.describe('Providers Page', () => {
  4  |   test('should load providers page and allow tab switching', async ({ page }) => {
  5  |     await page.goto('/providers');
  6  |     
  7  |     // Check for the Netflix tab
  8  |     const netflixTab = page.locator('text=Netflix').first();
  9  |     await expect(netflixTab).toBeVisible();
  10 | 
  11 |     // Check for Prime Video tab
  12 |     const primeTab = page.locator('text=Prime Video').first();
  13 |     await expect(primeTab).toBeVisible();
  14 | 
  15 |     // Click Prime Video and ensure URL updates
  16 |     await primeTab.click();
> 17 |     await expect(page).toHaveURL(/with_watch_providers=9/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  18 |   });
  19 | });
  20 | 
```