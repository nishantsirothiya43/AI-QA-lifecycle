import { test, expect } from '@playwright/test';

test.describe('Demo TodoMVC (public prototype target)', () => {
  test('should add a todo item', async ({ page }) => {
    // Playwright-hosted TodoMVC demo (no local server required).
    await page.goto('/todomvc/', { waitUntil: 'domcontentloaded' });

    // The demo mounts React after downloading bundle.js; wait for the classic TodoMVC input.
    const input = page.locator('input.new-todo');
    await expect(input).toBeVisible({ timeout: 30_000 });

    await input.fill('Prototype smoke task');
    await input.press('Enter');

    await expect(page.locator('.todo-list li .view label', { hasText: 'Prototype smoke task' })).toBeVisible({
      timeout: 30_000,
    });
  });
});
