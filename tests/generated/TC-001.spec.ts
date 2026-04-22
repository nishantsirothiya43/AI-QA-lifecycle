import { test, expect } from '@playwright/test';

test.describe('Login with valid credentials', () => {
  test('Verify successful login with valid username and password', async ({ page }) => {
    // Navigate to the OrangeHRM login page
    await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login', { waitUntil: 'domcontentloaded' });

    // Step 1: Enter 'Admin' in the username field
    const usernameField = page.getByPlaceholder('Username');
    await expect(usernameField).toBeVisible();
    await usernameField.fill('Admin');

    // Verify username field displays 'Admin'
    await expect(usernameField).toHaveValue('Admin');

    // Step 2: Enter 'admin123' in the password field
    const passwordField = page.getByPlaceholder('Password');
    await expect(passwordField).toBeVisible();
    await passwordField.fill('admin123');

    // Verify password field displays 'admin123'
    await expect(passwordField).toHaveValue('admin123');

    // Step 3: Click the 'Login' button
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Verify user is redirected to the dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Verify dashboard heading or key element is visible
    const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
    await expect(dashboardHeading).toBeVisible({ timeout: 15000 });
  });
});
