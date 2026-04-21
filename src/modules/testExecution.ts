import { exec } from 'child_process';
import { promisify } from 'util';

import { ExecutionReport, ExecutionResult } from '../types';
import { refreshConfigFromEnv } from '../config';
import { fileExists, readJSON, writeJSON } from '../utils/fileHelpers';

const execAsync = promisify(exec);
const REPORT_OUTPUT_PATH = 'data/output/execution-report.json';
const PLAYWRIGHT_REPORT_PATH = 'data/output/playwright-report.json';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildPlaywrightCommand(): string {
  const mode = (process.env.PLAYWRIGHT_EXECUTION_MODE ?? 'local').toLowerCase();
  if (mode !== 'docker') {
    return 'npx playwright test tests/generated';
  }

  const image = process.env.DOCKER_PLAYWRIGHT_IMAGE ?? 'mcr.microsoft.com/playwright:v1.59.1-noble';
  const cwd = process.cwd();
  return [
    'docker run --rm --ipc=host',
    `-v ${shellQuote(`${cwd}:/work`)}`,
    '-w /work',
    shellQuote(image),
    '/bin/bash -lc',
    shellQuote('npm ci --include=dev && npx playwright test tests/generated'),
  ].join(' ');
}

type PlaywrightError = {
  message?: string;
  stack?: string;
};

type PlaywrightResult = {
  status?: string;
  duration?: number;
  error?: PlaywrightError;
  errors?: Array<{ message?: string }>;
};

type PlaywrightTest = {
  results?: PlaywrightResult[];
};

type PlaywrightSpec = {
  title?: string;
  file?: string;
  line?: number;
  tests?: PlaywrightTest[];
};

type PlaywrightSuite = {
  title?: string;
  file?: string;
  suites?: PlaywrightSuite[];
  specs?: PlaywrightSpec[];
};

type PlaywrightReport = {
  stats?: {
    expected?: number;
    unexpected?: number;
    skipped?: number;
  };
  suites?: PlaywrightSuite[];
};

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

function collectSpecs(suites: PlaywrightSuite[] | undefined): PlaywrightSpec[] {
  if (!suites) return [];

  const specs: PlaywrightSpec[] = [];
  const stack = [...suites];

  while (stack.length > 0) {
    const suite = stack.pop();
    if (!suite) continue;

    if (Array.isArray(suite.specs)) {
      specs.push(...suite.specs);
    }
    if (Array.isArray(suite.suites)) {
      stack.push(...suite.suites);
    }
  }

  return specs;
}

function toExecutionStatus(status: string | undefined): ExecutionResult['status'] {
  if (status === 'passed' || status === 'expected') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'failed';
}

async function buildReportFromPlaywrightJson(runAt: string): Promise<ExecutionReport | null> {
  if (!(await fileExists(PLAYWRIGHT_REPORT_PATH))) {
    return null;
  }

  const raw = await readJSON<PlaywrightReport>(PLAYWRIGHT_REPORT_PATH);
  const specs = collectSpecs(raw.suites);

  const results: ExecutionResult[] = [];

  for (const spec of specs) {
    const firstTest = spec.tests?.[0];
    const firstResult = firstTest?.results?.[0];
    const status = toExecutionStatus(firstResult?.status);
    const errorMessage =
      firstResult?.error?.message ??
      firstResult?.errors?.find((e) => typeof e.message === 'string')?.message;

    results.push({
      testId: spec.file ? `${spec.file}:${spec.line ?? 0}` : `SPEC-${results.length + 1}`,
      testTitle: spec.title ?? 'Untitled test',
      status,
      duration: firstResult?.duration ?? 0,
      error: status === 'failed' ? errorMessage ?? 'Playwright test failed.' : undefined,
      stackTrace: firstResult?.error?.stack,
    });
  }

  const passed = raw.stats?.expected ?? results.filter((r) => r.status === 'passed').length;
  const failed = raw.stats?.unexpected ?? results.filter((r) => r.status === 'failed').length;
  const skipped = raw.stats?.skipped ?? results.filter((r) => r.status === 'skipped').length;

  return {
    runAt,
    totalTests: passed + failed + skipped,
    passed,
    failed,
    skipped,
    results,
  };
}

export async function runTests(): Promise<ExecutionReport> {
  refreshConfigFromEnv();
  const runAt = new Date().toISOString();
  const command = buildPlaywrightCommand();

  try {
    await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
    });

    const jsonReport = await buildReportFromPlaywrightJson(runAt);
    if (!jsonReport) {
      throw new Error(
        `Playwright run succeeded but JSON report not found at "${PLAYWRIGHT_REPORT_PATH}".`
      );
    }

    await writeJSON(REPORT_OUTPUT_PATH, jsonReport);
    return jsonReport;
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    const jsonReport = await buildReportFromPlaywrightJson(runAt);
    if (jsonReport) {
      await writeJSON(REPORT_OUTPUT_PATH, jsonReport);
      if (execError.message) {
        console.error(`Playwright execution failed: ${execError.message}`);
      }
      return jsonReport;
    }

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
