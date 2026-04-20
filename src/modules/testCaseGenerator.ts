import { z } from 'zod';

import { TestCase } from '../types';
import { callAI, cleanJsonResponse } from '../utils/ai';
import { writeJSON } from '../utils/fileHelpers';

const OUTPUT_PATH = 'data/output/test-cases.json';

export const TEST_CASE_SYSTEM_PROMPT = `You are a senior QA engineer. Generate comprehensive structured test cases from acceptance criteria.

CRITICAL: Respond with ONLY a valid JSON array. No markdown. No code fences. No explanation.
Your response must start with [ and end with ].

Each object must follow this EXACT schema:
{
  "id": "TC-001",
  "title": "short descriptive title",
  "type": "UI",
  "priority": "High",
  "description": "what this test verifies",
  "preconditions": ["prerequisite 1"],
  "steps": [
    { "stepNumber": 1, "action": "what to do", "expectedResult": "what should happen" }
  ],
  "expectedOutcome": "final expected state",
  "tags": ["login", "smoke"],
  "source": "generated",
  "reviewStatus": "pending"
}

For API test cases ONLY, also include:
"apiDetails": {
  "method": "POST",
  "endpoint": "/api/auth/login",
  "requestBody": { "username": "user", "password": "pass" },
  "expectedStatus": 200,
  "expectedResponseFields": ["token", "userId"]
}

Rules:
- Generate BOTH UI (no apiDetails) and API (with apiDetails) test cases
- Cover: happy path, error/negative cases, edge cases, boundary conditions
- Sequential IDs: TC-001, TC-002, TC-003...
- Priority: High=critical path, Medium=error handling, Low=edge cases`;

export const testCaseUserPrompt = (criteria: string): string =>
  `Generate comprehensive test cases for this feature:\n\n${criteria}\n\nRemember: respond with ONLY the JSON array.`;

export const TEST_CASE_RETRY_PROMPT = `Your previous response could not be parsed as JSON.
You MUST respond with ONLY a valid JSON array starting with [ and ending with ].
No text before or after. No markdown. No explanation. Just the raw JSON array.`;

const ApiTestDetailsSchema = z.object({
  method: z.string(),
  endpoint: z.string(),
  requestBody: z.record(z.unknown()).optional(),
  expectedStatus: z.number(),
  expectedResponseFields: z.array(z.string()).optional(),
});

const TestStepSchema = z.object({
  stepNumber: z.number(),
  action: z.string(),
  expectedResult: z.string(),
});

const TestCaseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    type: z.enum(['UI', 'API']),
    priority: z.enum(['High', 'Medium', 'Low']),
    description: z.string(),
    preconditions: z.array(z.string()),
    steps: z.array(TestStepSchema),
    expectedOutcome: z.string(),
    tags: z.array(z.string()),
    apiDetails: ApiTestDetailsSchema.optional(),
    source: z.enum(['generated', 'manual']).default('generated'),
    reviewStatus: z.enum(['pending', 'approved', 'rejected', 'edited']).default('pending'),
    reviewNotes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'API' && !value.apiDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API test cases must include apiDetails',
      });
    }

    if (value.type === 'UI' && value.apiDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UI test cases must not include apiDetails',
      });
    }
  });

type ParsedTestCase = z.infer<typeof TestCaseSchema>;

function parseTestCasesFromModelText(raw: string): TestCase[] {
  const jsonText = cleanJsonResponse(raw);
  const parsed = JSON.parse(jsonText) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('AI response JSON is not an array.');
  }

  return parsed.map((item, index) => {
    const result = TestCaseSchema.safeParse(item);
    if (!result.success) {
      const message = result.error.issues.map((e) => e.message).join('; ');
      throw new Error(`Invalid test case at index ${index}: ${message}`);
    }

    const parsedCase = result.data as ParsedTestCase;
    return parsedCase as TestCase;
  });
}

export async function generateTestCases(input: string): Promise<TestCase[]> {
  try {
    try {
      const rawResponse = await callAI(TEST_CASE_SYSTEM_PROMPT, testCaseUserPrompt(input));
      return await finalizeTestCases(rawResponse);
    } catch (firstError) {
      const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);
      const rawResponse = await callAI(
        TEST_CASE_SYSTEM_PROMPT,
        `${testCaseUserPrompt(input)}\n\n${TEST_CASE_RETRY_PROMPT}`
      );
      try {
        return await finalizeTestCases(rawResponse);
      } catch {
        throw new Error(firstMessage);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate test cases: ${message}`);
  }
}

async function finalizeTestCases(rawResponse: string): Promise<TestCase[]> {
  const testCases = parseTestCasesFromModelText(rawResponse);
  await writeJSON(OUTPUT_PATH, testCases);
  return testCases;
}
