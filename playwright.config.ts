import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';

const DEFAULT_TARGET_URL = 'https://demo.playwright.dev/todomvc/';

function resolveBaseUrl(): string {
  const filePath = 'data/input/target-url.txt';
  if (!existsSync(filePath)) {
    return DEFAULT_TARGET_URL;
  }
  const value = readFileSync(filePath, 'utf-8').trim();
  return value || DEFAULT_TARGET_URL;
}

export default defineConfig({
  testDir: './tests/generated',
  /** Artifacts (video, trace, screenshots) land here for later review. */
  outputDir: 'test-results',
  timeout: 30000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'data/output/playwright-report.json' }],
  ],
  use: {
    baseURL: resolveBaseUrl(),
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    /** Record every run; files are under test-results/ (see .gitignore). */
    video: 'on',
  },
});
