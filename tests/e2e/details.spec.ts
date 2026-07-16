import { test, expect } from '@playwright/test';

test.describe('Details Page', () => {
  test('should load details page for a movie', async ({ page }) => {
    // Navigating to Inception (id: 27205)
    await page.goto('/details/27205?type=movie');
    
    // Check title exists
    await expect(page.locator('h1')).toBeVisible();

    // Check tabs
    await expect(page.locator('text=Cast').first()).toBeVisible();
    await expect(page.locator('text=Reviews').first()).toBeVisible();
  });
});
