import cors from 'cors';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';

import { CONFIG, refreshConfigFromEnv } from './config';
import { analyzeFailures } from './modules/failureAnalysis';
import { generateScripts } from './modules/scriptGenerator';
import { generateTestCases } from './modules/testCaseGenerator';
import { runTests } from './modules/testExecution';
import { ExecutionReport, FailureCategory, ScriptFile, TestCase } from './types';
import { fileExists, readJSON, readTextFile, writeJSON, writeTextFile } from './utils/fileHelpers';
import { getProviderInfo } from './utils/ai';

type FrontendInputState = {
  targetUrl: string;
  acceptanceCriteria: string;
  updatedAt: string | null;
};

type PipelineSnapshot = {
  status: {
    provider: string;
    model: string;
    totalGenerated: number;
    totalApproved: number;
    totalScripts: number;
    lastRun: string | null;
  };
  frontendInput: FrontendInputState;
  testCases: TestCase[];
  scripts: ScriptFile[];
  failures: FailureCategory[];
  executionReport: ExecutionReport | null;
};

type ProviderConfigPayload = {
  aiProvider: 'gemini' | 'ollama' | 'claude';
  mockLlm: boolean;
  playwrightExecutionMode: 'local' | 'docker';
  dockerPlaywrightImage: string;
  geminiModel: string;
  geminiApiKey?: string;
  hasGeminiApiKey: boolean;
  ollamaBaseUrl: string;
  ollamaModel: string;
  claudeModel: string;
  claudeApiKey?: string;
  hasClaudeApiKey: boolean;
};

const app = express();
const port = Number.parseInt(process.env.API_PORT ?? '8787', 10);

const PATHS = {
  env: '.env',
  acceptanceCriteria: path.join(CONFIG.paths.inputDir, 'acceptance-criteria.md'),
  targetUrl: path.join(CONFIG.paths.inputDir, 'target-url.txt'),
  testCases: path.join(CONFIG.paths.outputDir, 'test-cases.json'),
  reviewedCases: path.join(CONFIG.paths.outputDir, 'reviewed-test-cases.json'),
  executionReport: path.join(CONFIG.paths.outputDir, 'execution-report.json'),
  failureAnalysis: path.join(CONFIG.paths.outputDir, 'failure-analysis.json'),
  generatedTestsDir: path.join('tests', 'generated'),
} as const;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function envValue(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

function upsertEnvVariable(content: string, key: string, value: string): string {
  const escaped = envValue(value);
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${escaped}`);
  }
  const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${suffix}${key}=${escaped}\n`;
}

async function loadProviderConfig(): Promise<ProviderConfigPayload> {
  const config = refreshConfigFromEnv();
  return {
    aiProvider: config.aiProvider,
    mockLlm: (process.env.MOCK_LLM ?? '').toLowerCase() === 'true',
    playwrightExecutionMode:
      (process.env.PLAYWRIGHT_EXECUTION_MODE ?? 'local').toLowerCase() === 'docker'
        ? 'docker'
        : 'local',
    dockerPlaywrightImage:
      process.env.DOCKER_PLAYWRIGHT_IMAGE ?? 'mcr.microsoft.com/playwright:v1.59.1-noble',
    geminiModel: config.gemini.model,
    hasGeminiApiKey: Boolean(config.gemini.apiKey),
    ollamaBaseUrl: config.ollama.baseUrl,
    ollamaModel: config.ollama.model,
    claudeModel: config.claude.model,
    hasClaudeApiKey: Boolean(config.claude.apiKey),
  };
}

async function readJsonIfExists<T>(filePath: string, fallback: T): Promise<T> {
  if (!(await fileExists(filePath))) {
    return fallback;
  }
  return readJSON<T>(filePath);
}

async function loadFrontendInput(): Promise<FrontendInputState> {
  const [criteriaExists, urlExists] = await Promise.all([
    fileExists(PATHS.acceptanceCriteria),
    fileExists(PATHS.targetUrl),
  ]);
  const [acceptanceCriteria, targetUrl] = await Promise.all([
    criteriaExists ? readTextFile(PATHS.acceptanceCriteria) : Promise.resolve(''),
    urlExists ? readTextFile(PATHS.targetUrl) : Promise.resolve('https://demo.playwright.dev/todomvc/'),
  ]);
  const criteriaStat = criteriaExists ? await fs.stat(PATHS.acceptanceCriteria) : null;

  return {
    targetUrl: targetUrl.trim() || 'https://demo.playwright.dev/todomvc/',
    acceptanceCriteria,
    updatedAt: criteriaStat ? criteriaStat.mtime.toISOString() : null,
  };
}

async function loadGeneratedScripts(): Promise<ScriptFile[]> {
  if (!(await fileExists(PATHS.generatedTestsDir))) {
    return [];
  }

  const entries = await fs.readdir(PATHS.generatedTestsDir);
  const files = entries.filter((entry) => entry.endsWith('.spec.ts'));

  const scripts = await Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(PATHS.generatedTestsDir, fileName);
      const scriptContent = await readTextFile(filePath);
      return {
        testId: fileName.replace('.spec.ts', ''),
        filePath,
        scriptContent,
      } as ScriptFile;
    })
  );

  return scripts.sort((a, b) => a.testId.localeCompare(b.testId));
}

async function buildSnapshot(): Promise<PipelineSnapshot> {
  const [frontendInput, testCases, failures, executionReport, scripts] = await Promise.all([
    loadFrontendInput(),
    readJsonIfExists<TestCase[]>(PATHS.testCases, []),
    readJsonIfExists<FailureCategory[]>(PATHS.failureAnalysis, []),
    readJsonIfExists<ExecutionReport | null>(PATHS.executionReport, null),
    loadGeneratedScripts(),
  ]);

  const provider = getProviderInfo();
  const approved = testCases.filter((testCase) => testCase.reviewStatus === 'approved').length;

  return {
    status: {
      provider: provider.provider,
      model: provider.model,
      totalGenerated: testCases.length,
      totalApproved: approved,
      totalScripts: scripts.length,
      lastRun: executionReport?.runAt ?? null,
    },
    frontendInput,
    testCases,
    scripts,
    failures,
    executionReport,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/provider-config', async (_req, res) => {
  try {
    res.json(await loadProviderConfig());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/provider-config', async (req, res) => {
  const body = req.body as Partial<ProviderConfigPayload>;
  const provider = body.aiProvider;
  if (provider !== 'gemini' && provider !== 'ollama' && provider !== 'claude') {
    res.status(400).json({ error: 'aiProvider must be gemini, ollama, or claude.' });
    return;
  }
  const executionMode =
    body.playwrightExecutionMode === 'docker' || body.playwrightExecutionMode === 'local'
      ? body.playwrightExecutionMode
      : 'local';

  try {
    const current = (await fileExists(PATHS.env)) ? await readTextFile(PATHS.env) : '';
    let next = current;
    next = upsertEnvVariable(next, 'AI_PROVIDER', provider);
    next = upsertEnvVariable(next, 'MOCK_LLM', String(Boolean(body.mockLlm)));
    next = upsertEnvVariable(next, 'PLAYWRIGHT_EXECUTION_MODE', executionMode);
    next = upsertEnvVariable(
      next,
      'DOCKER_PLAYWRIGHT_IMAGE',
      body.dockerPlaywrightImage?.trim() || 'mcr.microsoft.com/playwright:v1.59.1-noble'
    );
    next = upsertEnvVariable(next, 'GEMINI_MODEL', body.geminiModel?.trim() || CONFIG.gemini.model);
    next = upsertEnvVariable(
      next,
      'OLLAMA_BASE_URL',
      body.ollamaBaseUrl?.trim() || CONFIG.ollama.baseUrl
    );
    next = upsertEnvVariable(next, 'OLLAMA_MODEL', body.ollamaModel?.trim() || CONFIG.ollama.model);
    next = upsertEnvVariable(next, 'CLAUDE_MODEL', body.claudeModel?.trim() || CONFIG.claude.model);

    if (body.geminiApiKey && body.geminiApiKey.trim()) {
      next = upsertEnvVariable(next, 'GEMINI_API_KEY', body.geminiApiKey.trim());
    }
    if (body.claudeApiKey && body.claudeApiKey.trim()) {
      next = upsertEnvVariable(next, 'ANTHROPIC_API_KEY', body.claudeApiKey.trim());
    }

    await writeTextFile(PATHS.env, next);
    refreshConfigFromEnv();
    res.json(await loadProviderConfig());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.get('/api/snapshot', async (_req, res) => {
  try {
    res.json(await buildSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/context', async (req, res) => {
  const body = req.body as Partial<FrontendInputState>;
  const targetUrl = (body.targetUrl ?? '').trim();
  const acceptanceCriteria = body.acceptanceCriteria ?? '';

  if (!targetUrl) {
    res.status(400).json({ error: 'targetUrl is required.' });
    return;
  }

  try {
    await Promise.all([
      writeTextFile(PATHS.targetUrl, `${targetUrl}\n`),
      writeTextFile(PATHS.acceptanceCriteria, acceptanceCriteria),
    ]);
    res.json(await buildSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/generate-test-cases', async (_req, res) => {
  try {
    const criteria = await readTextFile(PATHS.acceptanceCriteria);
    await generateTestCases(criteria);
    res.json(await buildSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/review/apply', async (req, res) => {
  const body = req.body as { testCases?: TestCase[] };
  if (!Array.isArray(body.testCases)) {
    res.status(400).json({ error: 'testCases array is required.' });
    return;
  }

  try {
    await Promise.all([
      writeJSON(PATHS.testCases, body.testCases),
      writeJSON(PATHS.reviewedCases, body.testCases),
    ]);
    res.json(await buildSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/generate-scripts', async (_req, res) => {
  try {
    if (!(await fileExists(PATHS.reviewedCases)) && (await fileExists(PATHS.testCases))) {
      const testCases = await readJSON<TestCase[]>(PATHS.testCases);
      await writeJSON(PATHS.reviewedCases, testCases);
    }
    await generateScripts(PATHS.reviewedCases);
    res.json(await buildSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/run-tests', async (_req, res) => {
  try {
    await runTests();
    res.json(await buildSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/analyze-failures', async (_req, res) => {
  try {
    await analyzeFailures(PATHS.executionReport);
    res.json(await buildSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/run-full-pipeline', async (_req, res) => {
  try {
    const criteria = await readTextFile(PATHS.acceptanceCriteria);
    const testCases = await generateTestCases(criteria);
    await writeJSON(PATHS.reviewedCases, testCases);
    await generateScripts(PATHS.reviewedCases);
    await runTests();
    await analyzeFailures(PATHS.executionReport);
    res.json(await buildSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

process.on('uncaughtException', (error) => {
  console.error('[API] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[API] Unhandled rejection:', reason);
});

const server = app.listen(port, () => {
  console.log(`QA lifecycle API running on http://localhost:${port}`);
});

// Some shells/tooling environments can unintentionally unref child servers.
// Keep one lightweight timer so the process remains attached while API is intended to run.
const keepAliveTimer = setInterval(() => undefined, 60 * 60 * 1000);

server.on('close', () => {
  clearInterval(keepAliveTimer);
});
