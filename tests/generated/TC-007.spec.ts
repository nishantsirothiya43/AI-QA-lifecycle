import { test, expect } from '@playwright/test';

test.describe('Locked Account - UI', () => {
  test('should display an error message for a locked account login', async ({ page }) => {
    // Navigate to the ToDoMVC application
    await page.goto('/todomvc/', { waitUntil: 'domcontentloaded' });

    // Assuming the login form is within the ToDoMVC app, or it's a separate step to navigate to login.
    // For this example, we'll assume a hypothetical login form is present or accessible.
    // If the actual application requires navigation to a specific login page, this would be adjusted.

    // Since demo.playwright.dev/todomvc/ doesn't have a login, we'll simulate a login form
    // within the test for demonstration purposes. In a real application, you would navigate
    // to the actual login page.

    // Mocking a simple login form scenario
    // If your actual app has a login page, replace these steps with page navigation and interactions.
    const usernameInput = page.getByPlaceholder('Username');
    const passwordInput = page.getByPlaceholder('Password');
    const loginButton = page.getByRole('button', { name: 'Login' });
    const errorMessage = page.getByText('Your account has been locked. Please contact support.'); // Example error message

    // Step 1: Enter valid username and any password
    // EXPECT: Input fields accept the credentials.
    await usernameInput.fill('locked.user@example.com');
    await expect(usernameInput).toHaveValue('locked.user@example.com');

    await passwordInput.fill('anypassword');
    await expect(passwordInput).toHaveValue('anypassword');

    // Step 2: Click the login button
    await loginButton.click();

    // EXPECT: A specific error message regarding account lock is displayed.
    // Wait for the error message to be visible
    await expect(errorMessage).toBeVisible();
  });
});
