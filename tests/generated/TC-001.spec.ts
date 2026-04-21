import { test, expect } from '@playwright/test';

test.describe('Login Module', () => {

  test('Login with Valid Credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Expect the login page to be visible
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    // Fill in the username field
    await page.getByPlaceholder('Username').fill('Admin');

    // Fill in the password field
    await page.getByPlaceholder('Password').fill('admin123');

    // Click the login button
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify successful redirection to the Dashboard page
    // Look for a unique element on the dashboard page, e.g., the "Dashboard" heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Optionally, verify the URL changed to the dashboard route
    await expect(page).toHaveURL(/.*dashboard\/index/);
  });

});
