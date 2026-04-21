import { test, expect } from '@playwright/test';

test.describe('Login with locked account - UI', () => {
  test('should display error message for locked account', async ({ page }) => {
    // Navigate to the todomvc app
    await page.goto('/todomvc/', { waitUntil: 'domcontentloaded' });

    // 1. Enter 'locked.user@example.com' into the username field.
    //    EXPECT: The username field accepts the input.
    const usernameInput = page.getByPlaceholder('Username');
    await usernameInput.fill('locked.user@example.com');
    await expect(usernameInput).toHaveValue('locked.user@example.com');

    // 2. Enter 'AnyPass123!' into the password field.
    //    EXPECT: The password field accepts the input and masks characters.
    const passwordInput = page.getByPlaceholder('Password');
    await passwordInput.fill('AnyPass123!');
    // Expect password input to be of type password and masked
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveValue('AnyPass123!');

    // 3. Click the 'Login' button.
    //    EXPECT: An error message is displayed indicating the account is locked or disabled.
    const loginButton = page.getByRole('button', { name: 'Login' });
    await loginButton.click();

    // Wait for the error message to be visible
    const errorMessage = page.locator('div.error-message'); // Assuming an error message element exists
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Your account has been locked'); // Customize text as per actual error message
  });
});
