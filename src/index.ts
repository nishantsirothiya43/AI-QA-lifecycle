import { CONFIG } from './config';
import { generateTestCases } from './modules/testCaseGenerator';
import { reviewTestCases } from './modules/humanReview';
import { generateScripts } from './modules/scriptGenerator';
import { runTests } from './modules/testExecution';
import { analyzeFailures } from './modules/failureAnalysis';
import { fileExists, readTextFile, writeTextFile } from './utils/fileHelpers';
import { getProviderInfo } from './utils/ai';

const ACCEPTANCE_CRITERIA_PATH = `${CONFIG.paths.inputDir}/acceptance-criteria.md`;

const DEFAULT_ACCEPTANCE_CRITERIA = `# Feature: User Login

## Acceptance Criteria
1. User can log in with valid credentials.
2. Invalid credentials show an error message.
3. Username and password are required.
4. Locked users cannot log in.
5. Login API returns 200 for valid credentials and 401 for invalid credentials.`;

async function loadAcceptanceCriteria(): Promise<string> {
  if (await fileExists(ACCEPTANCE_CRITERIA_PATH)) {
    return readTextFile(ACCEPTANCE_CRITERIA_PATH);
  }

  await writeTextFile(ACCEPTANCE_CRITERIA_PATH, `${DEFAULT_ACCEPTANCE_CRITERIA}\n`);
  console.warn(`No acceptance criteria file found. Created a starter file at ${ACCEPTANCE_CRITERIA_PATH}`);
  return `${DEFAULT_ACCEPTANCE_CRITERIA}\n`;
}

async function main(): Promise<void> {
  try {
    const { provider, model } = getProviderInfo();
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     AI-Powered QA Lifecycle System       ║');
    console.log(`║     Provider: ${provider} (${model})`.padEnd(43, ' ') + '║');
    console.log('╚══════════════════════════════════════════╝');

    const acceptanceCriteria = await loadAcceptanceCriteria();

    console.log('Generating test cases...');
    const testCases = await generateTestCases(acceptanceCriteria);
    console.log(`Done. Generated ${testCases.length} test cases.`);
    console.log('Saved to: data/output/test-cases.json');

    console.log('\nStarting human review...');
    const reviewed = await reviewTestCases('data/output/test-cases.json');
    console.log(`Review complete. Processed ${reviewed.length} test cases.`);
    console.log('Saved to: data/output/reviewed-test-cases.json');

    console.log('\nGenerating Playwright scripts from approved cases...');
    const scripts = await generateScripts('data/output/reviewed-test-cases.json');
    console.log(`Script generation complete. Generated ${scripts.length} scripts.`);
    console.log('Saved to: tests/generated/');

    console.log('\nRunning Playwright tests...');
    const executionReport = await runTests();
    console.log('Execution complete.');
    console.log(
      `Summary: total=${executionReport.totalTests}, passed=${executionReport.passed}, failed=${executionReport.failed}, skipped=${executionReport.skipped}`
    );
    console.log('Saved to: data/output/execution-report.json');

    console.log('\nAnalyzing failures (if any)...');
    const failureAnalysis = await analyzeFailures('data/output/execution-report.json');
    console.log(`Failure analysis complete. Items: ${failureAnalysis.length}.`);
    console.log('Saved to: data/output/failure-analysis.json');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed: ${message}`);
    process.exit(1);
  }
}

main();
