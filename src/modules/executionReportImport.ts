import { z } from 'zod';

import { ExecutionReport } from '../types';

const ExecutionResultSchema = z.object({
  testId: z.string(),
  testTitle: z.string(),
  status: z.enum(['passed', 'failed', 'skipped']),
  duration: z.number(),
  error: z.string().optional(),
  stackTrace: z.string().optional(),
});

const ExecutionReportSchema = z.object({
  runAt: z.string(),
  totalTests: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  results: z.array(ExecutionResultSchema),
});

export function parseExecutionReportFromRequestBody(body: unknown): ExecutionReport {
  if (body && typeof body === 'object' && 'executionReport' in body) {
    return parseExecutionReportPayload((body as { executionReport: unknown }).executionReport);
  }
  return parseExecutionReportPayload(body);
}

export function parseExecutionReportPayload(raw: unknown): ExecutionReport {
  const result = ExecutionReportSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid execution report JSON (expected data/output/execution-report.json shape): ${msg}`);
  }
  return result.data as ExecutionReport;
}
