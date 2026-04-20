import { exec } from 'child_process';
import { promisify } from 'util';

import { ExecutionReport, ExecutionResult } from '../types';
import { writeJSON } from '../utils/fileHelpers';

const execAsync = promisify(exec);
const REPORT_OUTPUT_PATH = 'data/output/execution-report.json';

function parseCount(output: string, label: string): number {
  // Playwright commonly prints summaries like:
  // - "2 passed"
  // - "2 failed"
  // Sometimes also "2 passed (30s)" depending on reporter/version.
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`(^|\\n)\\s*(\\d+)\\s+${escaped}\\b`, 'i'),
    new RegExp(`(^|\\n)\\s*(\\d+)\\s+${escaped}\\s+tests?\\b`, 'i'),
  ];

  for (const regex of patterns) {
    const match = output.match(regex);
    if (match) {
      return Number.parseInt(match[2], 10);
    }
  }

  return 0;
}

function parseFailedResults(output: string): ExecutionResult[] {
  const lines = output.split('\n');
  const failed: ExecutionResult[] = [];
  let index = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    // Common Playwright list output for failures uses this marker.
    if (trimmed.includes('✘')) {
      const title = trimmed.replace(/^.*✘\s*/, '').trim();
      failed.push({
        testId: `FAILED-${index}`,
        testTitle: title || `Failed Test ${index}`,
        status: 'failed',
        duration: 0,
        error: extractFirstErrorBlock(output),
      });
      index += 1;
    }
  }

  return failed;
}

function extractFirstErrorBlock(output: string): string {
  const marker = 'Error:';
  const idx = output.indexOf(marker);
  if (idx === -1) {
    return 'See Playwright CLI output for full details.';
  }

  const slice = output.slice(idx, idx + 2000).trim();
  return slice.split('\n\n')[0]?.trim() ?? slice;
}

export async function runTests(): Promise<ExecutionReport> {
  const runAt = new Date().toISOString();
  const command = 'npx playwright test tests/generated';

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
    });

    const combinedOutput = `${stdout}\n${stderr}`;
    const passed = parseCount(combinedOutput, 'passed');
    const failed = parseCount(combinedOutput, 'failed');
    const failedResults = parseFailedResults(combinedOutput);
    const results: ExecutionResult[] = [
      ...failedResults,
      ...Array.from({ length: Math.max(0, passed) }, (_, i) => ({
        testId: `PASSED-${i + 1}`,
        testTitle: `Passed Test ${i + 1}`,
        status: 'passed' as const,
        duration: 0,
      })),
    ];

    const report: ExecutionReport = {
      runAt,
      totalTests: passed + failed,
      passed,
      failed,
      skipped: 0,
      results,
    };

    await writeJSON(REPORT_OUTPUT_PATH, report);
    return report;
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    const combinedOutput = `${execError.stdout ?? ''}\n${execError.stderr ?? ''}`;
    const passed = parseCount(combinedOutput, 'passed');
    const failed = parseCount(combinedOutput, 'failed');
    const failedResults = parseFailedResults(combinedOutput);

    const report: ExecutionReport = {
      runAt,
      totalTests: passed + failed || failedResults.length,
      passed,
      failed: failed || failedResults.length,
      skipped: 0,
      results: failedResults,
    };

    await writeJSON(REPORT_OUTPUT_PATH, report);
    console.error(`Playwright execution failed: ${execError.message ?? 'Unknown error'}`);
    return report;
  }
}
