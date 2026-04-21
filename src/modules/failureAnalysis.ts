import { ExecutionReport, FailureCategory } from '../types';
import { callAI, cleanJsonResponse } from '../utils/ai';
import { readJSON, writeJSON } from '../utils/fileHelpers';

const OUTPUT_PATH = 'data/output/failure-analysis.json';

type RawFailureAnalysis = {
  category?: string;
  confidence?: number;
  reasoning?: string;
  suggestedAction?: string;
};

const FAILURE_ANALYSIS_SYSTEM_PROMPT = `You are a QA engineer analyzing Playwright failures.

CRITICAL: Respond with ONLY a valid JSON object. No markdown. No code fences. No explanation.
Your response must start with { and end with }.

Required output schema:
{
  "category": "locator issue | timing issue | assertion issue | network issue",
  "confidence": 0.0,
  "reasoning": "short explanation",
  "suggestedAction": "clear next step"
}`;

function mapCategory(input: string): FailureCategory['category'] {
  const value = input.toLowerCase();
  if (value.includes('locator')) return 'script_locator_issue';
  if (value.includes('timing')) return 'environment_issue';
  if (value.includes('assertion')) return 'assertion_mismatch';
  if (value.includes('network')) return 'environment_issue';
  return 'unknown';
}

function mapConfidence(score: number): FailureCategory['confidence'] {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function failureUserPrompt(testId: string, testTitle: string, errorText: string): string {
  return `Analyze this Playwright failure.

Failure details:
Test ID: ${testId}
Title: ${testTitle}
Error: ${errorText}`;
}

export async function analyzeFailures(filePath: string): Promise<FailureCategory[]> {
  const executionReport = await readJSON<ExecutionReport>(filePath);
  const failedTests = executionReport.results.filter((result) => result.status === 'failed');

  const analyzed: FailureCategory[] = [];

  for (const failed of failedTests) {
    const userPrompt = failureUserPrompt(
      failed.testId,
      failed.testTitle,
      `${failed.error ?? 'No error text provided'}\n${failed.stackTrace ?? ''}`.trim()
    );

    try {
      const rawResponse = await callAI(FAILURE_ANALYSIS_SYSTEM_PROMPT, userPrompt, 600);
      const jsonText = cleanJsonResponse(rawResponse);
      const parsed = JSON.parse(jsonText) as RawFailureAnalysis;

      analyzed.push({
        testId: failed.testId,
        testTitle: failed.testTitle,
        category: mapCategory(parsed.category ?? 'unknown'),
        confidence: mapConfidence(
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
        ),
        reasoning: parsed.reasoning ?? 'No reasoning provided by AI.',
        suggestedAction: parsed.suggestedAction ?? 'Review failure logs and update test/app.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      analyzed.push({
        testId: failed.testId,
        testTitle: failed.testTitle,
        category: 'unknown',
        confidence: 'low',
        reasoning: `Failed to parse AI analysis: ${message}`,
        suggestedAction: 'Manually inspect Playwright output and retry analysis.',
      });
    }
  }

  await writeJSON(OUTPUT_PATH, analyzed);
  return analyzed;
}
