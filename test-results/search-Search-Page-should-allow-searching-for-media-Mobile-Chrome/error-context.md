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
- banner:
  - link "🎬 CinemaPhora":
    - /url: /
  - img
  - textbox "Search movies, TV shows…"
  - navigation "Categories":
    - link "🔥 Popular":
      - /url: /popular
    - link "📈 Trending":
      - /url: /trending
    - link "⏳ Coming Soon":
      - /url: /upcoming
    - link "⭐ Top Rated":
      - /url: /top-rated
    - link "🎬 In Theatres":
      - /url: /now-playing
    - link "💥 Action":
      - /url: /discover?genre=28
    - link "😂 Comedy":
      - /url: /discover?genre=35
    - link "👻 Horror":
      - /url: /discover?genre=27
    - link "🛸 Sci-Fi":
      - /url: /discover?genre=878
    - link "❤️ Romance":
      - /url: /discover?genre=10749
    - link "🕵️ Crime & Mystery":
      - /url: /discover?genre=80,9648
    - link "🧸 Family":
      - /url: /discover?genre=10751
    - link "🌸 Anime":
      - /url: /discover?genre=16&country=JP
    - link "🇰🇷 K-Drama":
      - /url: /discover?media=tv&country=KR
    - link "💅 Reality TV":
      - /url: /discover?media=tv&genre=10764
    - link "🇮🇳 Bollywood":
      - /url: /discover?media=movie&country=IN
    - link "🍿 Blockbusters":
      - /url: /discover?sort=revenue.desc
    - button "📍 Global"
- text: 🛑
- heading "Terms Declined" [level=1]
- paragraph: You must agree to the Terms of Use and Privacy Policy to use CinemaPhora. Because you declined, access to the application is restricted.
- link "Review Terms Again":
  - /url: /
- button "I Agree"
- navigation "Mobile navigation":
  - link "Home":
    - /url: /
    - img
    - text: Home
  - link "Providers":
    - /url: /providers
    - img
    - text: Providers
  - link "Discover":
    - /url: /discover
    - img
    - text: Discover
  - link "My List":
    - /url: /wishlist
    - img
    - text: My List
  - link "Settings":
    - /url: /settings
    - img
    - text: Settings
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