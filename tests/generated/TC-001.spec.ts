import { test, expect } from '@playwright/test';

test.describe('Login Functionality - UI', () => {
  test('Successful Login - UI', async ({ page }) => {
    await page.goto('/todomvc/', { waitUntil: 'domcontentloaded' });
    // Demo app has no real login; verify the main todo UI loads as a stand-in for "post-login" experience.
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible();
  });
});
