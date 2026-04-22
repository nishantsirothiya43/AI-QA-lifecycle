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
  "reviewStatus": "pending",
  "automationStatus": "automatable"
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

export const TEST_CASE_COMPACT_RETRY_PROMPT = `Previous output was truncated/invalid.
Return ONLY a valid JSON array.

Additional hard limits:
- Generate exactly 8 test cases total
- Keep each description and expectedOutcome to one short sentence
- Max 3 steps per test case
- Keep strings concise
- No markdown, no comments, no extra text`;

const JSON_REPAIR_SYSTEM_PROMPT = `You are a JSON repair assistant.
CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.`;

const jsonRepairUserPrompt = (brokenJson: string): string => `Fix this malformed JSON array so it becomes syntactically valid JSON.
Do not add commentary.
Preserve as much original data as possible.
Return ONLY the corrected JSON array.

Malformed JSON:
${brokenJson}`;

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
    automationStatus: z.enum(['automatable', 'not_automatable']).default('automatable'),
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

function normalizeTestCaseCandidate(item: unknown, index: number): unknown {
  const candidate = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;

  const steps = Array.isArray(candidate.steps)
    ? candidate.steps
        .map((step, stepIndex) => {
          const raw = (step && typeof step === 'object' ? step : {}) as Record<string, unknown>;
          return {
            stepNumber:
              typeof raw.stepNumber === 'number' && Number.isFinite(raw.stepNumber)
                ? raw.stepNumber
                : stepIndex + 1,
            action: typeof raw.action === 'string' ? raw.action : 'Execute test step',
            expectedResult:
              typeof raw.expectedResult === 'string'
                ? raw.expectedResult
                : 'Expected behavior is observed',
          };
        })
        .slice(0, 6)
    : [];

  const normalized: Record<string, unknown> = {
    id:
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id.trim()
        : `TC-${String(index + 1).padStart(3, '0')}`,
    title:
      typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title.trim()
        : `Generated test case ${index + 1}`,
    type: candidate.type === 'API' ? 'API' : 'UI',
    priority:
      candidate.priority === 'High' || candidate.priority === 'Medium' || candidate.priority === 'Low'
        ? candidate.priority
        : 'Medium',
    description:
      typeof candidate.description === 'string' && candidate.description.trim()
        ? candidate.description.trim()
        : 'Auto-normalized description from AI output',
    preconditions: Array.isArray(candidate.preconditions)
      ? candidate.preconditions.filter((v): v is string => typeof v === 'string')
      : [],
    steps:
      steps.length > 0
        ? steps
        : [
            {
              stepNumber: 1,
              action: 'Review feature flow',
              expectedResult: 'System behavior matches acceptance criteria',
            },
          ],
    expectedOutcome:
      typeof candidate.expectedOutcome === 'string' && candidate.expectedOutcome.trim()
        ? candidate.expectedOutcome.trim()
        : 'Feature behaves as expected.',
    tags: Array.isArray(candidate.tags)
      ? candidate.tags.filter((v): v is string => typeof v === 'string')
      : [],
    source: 'generated',
    reviewStatus: 'pending',
    automationStatus: 'automatable',
  };

  if (normalized.type === 'API') {
    const apiDetails =
      candidate.apiDetails && typeof candidate.apiDetails === 'object'
        ? (candidate.apiDetails as Record<string, unknown>)
        : {};

    normalized.apiDetails = {
      method: typeof apiDetails.method === 'string' ? apiDetails.method : 'POST',
      endpoint: typeof apiDetails.endpoint === 'string' ? apiDetails.endpoint : '/api/placeholder',
      requestBody:
        apiDetails.requestBody && typeof apiDetails.requestBody === 'object'
          ? (apiDetails.requestBody as Record<string, unknown>)
          : undefined,
      expectedStatus:
        typeof apiDetails.expectedStatus === 'number' && Number.isFinite(apiDetails.expectedStatus)
          ? apiDetails.expectedStatus
          : 200,
      expectedResponseFields: Array.isArray(apiDetails.expectedResponseFields)
        ? apiDetails.expectedResponseFields.filter((v): v is string => typeof v === 'string')
        : undefined,
    };
  }

  return normalized;
}

function parseTestCasesFromModelText(raw: string): TestCase[] {
  const jsonText = cleanJsonResponse(raw);
  const parsed = JSON.parse(jsonText) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('AI response JSON is not an array.');
  }

  return parsed.map((item, index) => {
    const normalized = normalizeTestCaseCandidate(item, index);
    const result = TestCaseSchema.safeParse(normalized);
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
    const attempts: Array<{ userPrompt: string; maxTokens: number }> = [
      { userPrompt: testCaseUserPrompt(input), maxTokens: 2400 },
      { userPrompt: `${testCaseUserPrompt(input)}\n\n${TEST_CASE_RETRY_PROMPT}`, maxTokens: 2800 },
      {
        userPrompt: `${testCaseUserPrompt(input)}\n\n${TEST_CASE_COMPACT_RETRY_PROMPT}`,
        maxTokens: 2200,
      },
    ];

    let lastError = 'Unknown error';
    for (const attempt of attempts) {
      try {
        const rawResponse = await callAI(
          TEST_CASE_SYSTEM_PROMPT,
          attempt.userPrompt,
          attempt.maxTokens
        );
        return await finalizeTestCases(rawResponse);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error(lastError);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate test cases: ${message}`);
  }
}

async function finalizeTestCases(rawResponse: string): Promise<TestCase[]> {
  try {
    const testCases = parseTestCasesFromModelText(rawResponse);
    await writeJSON(OUTPUT_PATH, testCases);
    return testCases;
  } catch (initialParseError) {
    const repairedResponse = await callAI(
      JSON_REPAIR_SYSTEM_PROMPT,
      jsonRepairUserPrompt(cleanJsonResponse(rawResponse)),
      2400
    );

    const testCases = parseTestCasesFromModelText(repairedResponse);
    await writeJSON(OUTPUT_PATH, testCases);
    return testCases;
  }
}
