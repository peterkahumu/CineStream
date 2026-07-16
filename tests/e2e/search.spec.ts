import { test, expect } from '@playwright/test';

test.describe('Search Page', () => {
  test('should allow searching for media', async ({ page }) => {
    await page.goto('/search');
    
    const searchInput = page.getByPlaceholder(/Search for movies, TV shows.../i).first();
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('Inception');
    await page.waitForTimeout(1000); // Wait for debounce

    // Expect results to show up
    const results = page.locator('.media-card');
    await expect(results.first()).toBeVisible();
  });
});
