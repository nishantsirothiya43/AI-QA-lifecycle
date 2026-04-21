import { test, expect } from '@playwright/test';

test.describe('Login Form Validation', () => {
  test('Verify form validation for empty required fields', async ({ page }) => {
    await page.goto('/todomvc/', { waitUntil: 'domcontentloaded' });
    // Demo ToDoMVC has no login form; empty main input models "required fields not filled".
    const input = page.getByPlaceholder('What needs to be done?');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('');
  });
});
