# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: discover.spec.ts >> Discover Page >> should load discover page and show filter bar
- Location: tests/e2e/discover.spec.ts:4:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected pattern: /Discover/i
Received string:  "Terms Declined"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    14 × locator resolved to <h1 class="page-module__LGRapW__title">Terms Declined</h1>
       - unexpected value "Terms Declined"

```

```yaml
- heading "Terms Declined" [level=1]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Discover Page', () => {
  4  |   test('should load discover page and show filter bar', async ({ page }) => {
  5  |     await page.goto('/discover');
  6  |     
  7  |     // Check for the Discover heading
> 8  |     await expect(page.locator('h1')).toContainText(/Discover/i);
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  9  | 
  10 |     // Verify filter bar exists
  11 |     const filterBar = page.locator('.FilterBar_bar__*').first().or(page.locator('[class*="FilterBar_bar"]'));
  12 |     await expect(filterBar).toBeVisible();
  13 | 
  14 |     // Verify sort options exist
  15 |     const sortDropdown = page.getByRole('button', { name: /Sort By/i }).or(page.locator('text=Sort By').first());
  16 |     await expect(sortDropdown).toBeVisible();
  17 |   });
  18 | });
  19 | 
```