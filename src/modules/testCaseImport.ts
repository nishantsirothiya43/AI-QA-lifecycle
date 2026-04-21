import { z } from 'zod';

import { TestCase } from '../types';

const ApiTestDetailsSchema = z.object({
  method: z.string(),
  endpoint: z.string(),
  requestBody: z.record(z.string(), z.unknown()).optional(),
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
    source: z.enum(['generated', 'manual']),
    reviewStatus: z.enum(['pending', 'approved', 'rejected', 'edited']),
    reviewNotes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'API' && !value.apiDetails) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'API test cases must include apiDetails' });
    }
    if (value.type === 'UI' && value.apiDetails) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'UI test cases must not include apiDetails' });
    }
  });

function extractTestCasesArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as { testCases?: unknown }).testCases)) {
    return (raw as { testCases: unknown[] }).testCases;
  }
  throw new Error(
    'Body must be a JSON array of test cases, or { "testCases": [...] }, matching data/output/test-cases.json.'
  );
}

export function parseTestCasesJsonPayload(raw: unknown): TestCase[] {
  const rawArray = extractTestCasesArray(raw);

  const cases: TestCase[] = [];
  rawArray.forEach((item, index) => {
    const result = TestCaseSchema.safeParse(item);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join('; ');
      throw new Error(`Invalid test case at index ${index}: ${msg}`);
    }
    cases.push(result.data as TestCase);
  });
  return cases;
}

export function mergeTestCasesById(existing: TestCase[], incoming: TestCase[]): TestCase[] {
  const map = new Map<string, TestCase>();
  for (const tc of existing) {
    map.set(tc.id, tc);
  }
  for (const tc of incoming) {
    map.set(tc.id, tc);
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}
