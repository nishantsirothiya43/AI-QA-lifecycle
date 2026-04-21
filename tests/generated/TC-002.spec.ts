import { test, expect } from '@playwright/test';

test.describe('Dummy App Login Test', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('https://expandtesting.com');
    await page.getByLabel('Username').fill('practice');
    await page.getByLabel('Password').fill('SuperSecretPassword!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('You logged into a secure area!')).toBeVisible();
  });
});
