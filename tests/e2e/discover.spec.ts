import { test, expect } from '@playwright/test';

test.describe('Discover Page', () => {
  test('should load discover page and show filter bar', async ({ page }) => {
    await page.goto('/discover');
    
    // Check for the Discover heading
    await expect(page.locator('h1')).toContainText(/Discover/i);

    // Verify filter bar exists
    const filterBar = page.locator('.FilterBar_bar__*').first().or(page.locator('[class*="FilterBar_bar"]'));
    await expect(filterBar).toBeVisible();

    // Verify sort options exist
    const sortDropdown = page.getByRole('button', { name: /Sort By/i }).or(page.locator('text=Sort By').first());
    await expect(sortDropdown).toBeVisible();
  });
});
