import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage and display key elements', async ({ page }) => {
    await page.goto('/');

    // Check title or hero banner
    await expect(page.locator('.site-main')).toBeVisible();

    // Check that at least one media row is visible
    const rows = page.locator('h2');
    expect(await rows.count()).toBeGreaterThan(0);
    
    // Check navigation links in the header
    await expect(page.getByRole('link', { name: /Discover/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Providers/i }).first()).toBeVisible();
  });

  test('should navigate to trending page when clicking See All on trending row', async ({ page }) => {
    await page.goto('/');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Find the "Trending This Week" row and click its "See All" link
    const seeAllLink = page.locator('a:has-text("See All")').first();
    if (await seeAllLink.isVisible()) {
      await seeAllLink.click();
      await expect(page).toHaveURL(/\/trending/);
      await expect(page.locator('h1')).toContainText(/Trending/i);
    }
  });
});
