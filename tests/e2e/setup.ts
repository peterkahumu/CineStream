import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // We navigate to the app first so the domain matches
  await page.goto('/');

  // Set the terms accepted cookie
  await page.context().addCookies([
    {
      name: 'cinemaphora_terms',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }
  ]);

  // Save the state to a file
  await page.context().storageState({ path: authFile });
});
