import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/generated',
  timeout: 30000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'data/output/playwright-report.json' }],
  ],
  use: {
    // Public demo app maintained by Playwright (good for prototypes without a local server).
    // IMPORTANT: keep baseURL at the site root; navigate to `/todomvc/` in tests.
    baseURL: 'https://demo.playwright.dev',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
