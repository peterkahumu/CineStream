import { test, expect } from '@playwright/test';

test.describe('Providers Page', () => {
  test('should load providers page and allow tab switching', async ({ page }) => {
    await page.goto('/providers');
    
    // Check for the Netflix tab
    const netflixTab = page.getByRole('button', { name: /Netflix/i }).first();
    await expect(netflixTab).toBeVisible();

    // Check for Prime Video tab
    const primeTab = page.getByRole('button', { name: /Prime Video/i }).first();
    await expect(primeTab).toBeVisible();

    // Click Prime Video and ensure URL updates
    await primeTab.click();
    await expect(page).toHaveURL(/with_watch_providers=9/);
  });
});
