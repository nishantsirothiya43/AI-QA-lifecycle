import { promises as fs } from 'fs';
import path from 'path';

import { ScriptFile, TestCase } from '../types';
import { readJSON } from '../utils/fileHelpers';
import { callAI } from '../utils/ai';

const OUTPUT_DIR = 'tests/generated';

function normalizeScriptResponse(response: string): string {
  const trimmed = response.trim();
  const withoutFence = trimmed
    .replace(/^```(?:typescript|ts)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return withoutFence;
}

function isLikelyPlaywrightScript(content: string): boolean {
  return (
    content.includes("import { test, expect } from '@playwright/test'") &&
    content.includes('test.describe(') &&
    content.includes('test(')
  );
}

export const SCRIPT_SYSTEM_PROMPT = `You are a senior automation engineer specializing in Playwright with TypeScript.

CRITICAL: Respond with ONLY TypeScript code. No markdown fences. No explanation text.
Start your response directly with: import { test, expect } from '@playwright/test';

Rules:
- Import only from @playwright/test
- Use async/await throughout
- Prefer role-based selectors: getByRole, getByLabel, getByText, getByPlaceholder
- Use expect(locator).toBeVisible() — never page.waitForSelector()
- Never use page.waitForTimeout() — use expect with timeout instead
- Wrap everything in test.describe() block
- For API tests use the request fixture
- IMPORTANT: The application under test is a public demo hosted at https://demo.playwright.dev/todomvc/
  Assume Playwright config sets baseURL to https://demo.playwright.dev and navigate with:
  await page.goto('/todomvc/', { waitUntil: 'domcontentloaded' })
- Add brief comments on key steps`;

export const scriptUserPrompt = (testCase: TestCase): string => {
  const stepsText = testCase.steps
    .map(
      (step) =>
        `${step.stepNumber}. Action: ${step.action}\n   Expected: ${step.expectedResult}`
    )
    .join('\n');

  return `Generate a complete Playwright TypeScript test for:

Title: ${testCase.title}
Type: ${testCase.type}
Description: ${testCase.description}
Preconditions: ${testCase.preconditions.join('; ')}

Steps:
${testCase.steps.map((s) => `  ${s.stepNumber}. DO: ${s.action}\n     EXPECT: ${s.expectedResult}`).join('\n')}

Final Expected Outcome: ${testCase.expectedOutcome}
${
  testCase.apiDetails
    ? `
API Details:
  Method: ${testCase.apiDetails.method}
  Endpoint: ${testCase.apiDetails.endpoint}
  Expected HTTP Status: ${testCase.apiDetails.expectedStatus}
  Request Body: ${JSON.stringify(testCase.apiDetails.requestBody, null, 2)}
  Expected Response Fields: ${testCase.apiDetails.expectedResponseFields?.join(', ')}
`
    : ''
}`;
};

export async function generateScripts(filePath: string): Promise<ScriptFile[]> {
  const reviewedCases = await readJSON<TestCase[]>(filePath);
  const approvedCases = reviewedCases.filter((testCase) => testCase.reviewStatus === 'approved');

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const generatedScripts: ScriptFile[] = [];

  for (const testCase of approvedCases) {
    const outputPath = path.join(OUTPUT_DIR, `${testCase.id}.spec.ts`);

    try {
      const rawResponse = await callAI(SCRIPT_SYSTEM_PROMPT, scriptUserPrompt(testCase));
      const scriptContent = normalizeScriptResponse(rawResponse);

      if (!isLikelyPlaywrightScript(scriptContent)) {
        throw new Error('AI response is not a valid Playwright TypeScript test script.');
      }

      await fs.writeFile(outputPath, `${scriptContent}\n`, 'utf-8');

      generatedScripts.push({
        testId: testCase.id,
        filePath: outputPath,
        scriptContent,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to generate script for ${testCase.id}: ${message}`);
    }
  }

  return generatedScripts;
}
