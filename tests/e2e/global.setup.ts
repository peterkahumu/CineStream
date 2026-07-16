import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');

  // Wait for the modal and click "I Agree"
  const agreeBtn = page.getByRole('button', { name: /I Agree/i });
  await agreeBtn.click();

  // Wait a moment for the cookie to be set and the modal to unmount
  await page.waitForTimeout(500);

  // Save the state (which includes the new cookie)
  await page.context().storageState({ path: authFile });
});
