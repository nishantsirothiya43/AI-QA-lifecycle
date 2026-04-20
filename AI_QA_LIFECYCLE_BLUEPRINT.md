# AI-Powered QA Lifecycle System — Project Blueprint

> **For use with Cursor AI.** This document is a complete, step-by-step implementation guide. Follow sections in order. Each section contains precise prompts, file structures, and implementation notes for Cursor to execute.

---

## ⚡ Choose Your AI Provider (Read This First)

This project supports **three AI providers**. Pick one before starting:

| Provider | Cost | Setup | Quality | Best For |
|---|---|---|---|---|
| **Google Gemini** | Free tier available | API key from Google | Excellent | Recommended free option |
| **Ollama** | 100% Free | Install app locally | Good | No internet / full privacy |
| **Anthropic Claude** | ~$0.10–0.50 total | API key + credit card | Best | Production quality |

**Recommendation**: Use **Gemini** if you want free + cloud. Use **Ollama** if you want fully offline.

---

## Table of Contents

1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Repository Setup](#2-repository-setup)
   - [2A. Provider Setup: Gemini](#2a-provider-setup-gemini)
   - [2B. Provider Setup: Ollama](#2b-provider-setup-ollama)
   - [2C. Provider Setup: Claude](#2c-provider-setup-claude)
3. [Core Module: AI Provider Wrapper](#3-core-module-ai-provider-wrapper)
4. [Core Module: Test Case Generator](#4-core-module-test-case-generator)
5. [Core Module: Manual Test Input Handler](#5-core-module-manual-test-input-handler)
6. [Core Module: Playwright Script Generator](#6-core-module-playwright-script-generator)
7. [Core Module: Human Review Interface (CLI)](#7-core-module-human-review-interface-cli)
8. [Core Module: Execution Report Handler](#8-core-module-execution-report-handler)
9. [Core Module: AI Failure Categorizer](#9-core-module-ai-failure-categorizer)
10. [Orchestrator / Main Entry Point](#10-orchestrator--main-entry-point)
11. [Sample Data & Mocks](#11-sample-data--mocks)
12. [README.md Content](#12-readmemd-content)
13. [Design Note](#13-design-note)
14. [Cursor Workflow Tips](#14-cursor-workflow-tips)

---

## 1. Project Overview & Architecture

### What We're Building

A Node.js CLI prototype that demonstrates AI supporting the full QA lifecycle:

```
Acceptance Criteria (text input)
         │
         ▼
 [1] Test Case Generator (AI — Gemini / Ollama / Claude)
         │  generates structured JSON test cases (UI + API)
         ▼
 [2] Manual Test Input Handler
         │  merges AI-generated + user-provided test cases
         ▼
 [3] Human Review Interface (CLI)
         │  approve / reject / edit each test case interactively
         ▼
 [4] Playwright Script Generator (AI)
         │  converts approved test cases → .spec.ts files
         ▼
 [5] Human Review Interface (scripts)
         │  review generated scripts, approve/reject
         ▼
 [6] Execution Report Handler
         │  accepts Playwright JSON report (real or mocked)
         ▼
 [7] AI Failure Categorizer
         │  classifies each failure with reasoning
         ▼
    Final Report (JSON + CLI output)
```

### Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20+ with TypeScript | Modern, type-safe, great Playwright support |
| AI | Gemini / Ollama / Claude (switchable) | Provider abstraction via `src/utils/ai.ts` |
| Test Automation | Playwright | Required by spec |
| CLI UI | `inquirer` + `chalk` + `ora` | Interactive terminal without a web server |
| File I/O | Native `fs/promises` + `zod` | Schema validation of AI outputs |
| Config | `dotenv` | API key management |

### Folder Structure (target state)

```
ai-qa-lifecycle/
├── src/
│   ├── index.ts                    # Main orchestrator (entry point)
│   ├── config.ts                   # Config, constants, env
│   ├── types.ts                    # All TypeScript interfaces
│   │
│   ├── modules/
│   │   ├── testCaseGenerator.ts    # Module 1: AI generates test cases
│   │   ├── manualInputHandler.ts   # Module 2: Merge manual + AI test cases
│   │   ├── scriptGenerator.ts      # Module 3: AI generates Playwright scripts
│   │   ├── humanReview.ts          # Module 4: CLI review interface
│   │   ├── reportHandler.ts        # Module 5: Parse execution report
│   │   └── failureCategorizer.ts   # Module 6: AI classifies failures
│   │
│   └── utils/
│       ├── ai.ts                   # Universal AI wrapper (Gemini/Ollama/Claude)
│       ├── fileHelpers.ts          # Read/write JSON, .ts files
│       └── logger.ts               # Chalk-based colored logger
│
├── data/
│   ├── input/
│   │   ├── acceptance-criteria.md  # Feature input
│   │   └── manual-test-cases.json  # User-provided test cases
│   ├── output/
│   │   ├── generated-test-cases.json
│   │   ├── approved-test-cases.json
│   │   ├── scripts/                # Generated .spec.ts files
│   │   └── failure-report.json
│   └── mocks/
│       └── sample-execution-report.json
│
├── tests/                          # Generated Playwright specs land here
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 2. Repository Setup

### Cursor Prompt for this section:
> "Create a new Node.js TypeScript project called `ai-qa-lifecycle` with the folder structure defined in the blueprint. Install all dependencies listed below. Create `tsconfig.json`, `package.json`, `.env.example`, and `playwright.config.ts` with the configurations specified."

### `package.json` dependencies

```json
{
  "name": "ai-qa-lifecycle",
  "version": "1.0.0",
  "description": "AI-powered QA lifecycle prototype",
  "main": "dist/index.js",
  "scripts": {
    "start": "ts-node src/index.ts",
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "test": "playwright test",
    "test:report": "playwright show-report"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "@google/generative-ai": "^0.3.0",
    "chalk": "^4.1.2",
    "dotenv": "^16.3.1",
    "inquirer": "^8.2.6",
    "node-fetch": "^2.7.0",
    "ora": "^5.4.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/inquirer": "^8.2.10",
    "@types/node": "^20.10.0",
    "@types/node-fetch": "^2.6.9",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.2"
  }
}
```

> All three provider SDKs are installed. Only the one matching `AI_PROVIDER` in `.env` is actually called at runtime.

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `.env.example`

```bash
# ── AI Provider Selection ──────────────────────────────────────
# Choose ONE: gemini | ollama | claude
AI_PROVIDER=gemini

# ── Google Gemini (free tier) ──────────────────────────────────
# Get key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash

# ── Ollama (local, fully free) ─────────────────────────────────
# Install from https://ollama.com then run: ollama pull llama3
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# ── Anthropic Claude (paid, best quality) ──────────────────────
# Get key at: https://console.anthropic.com
ANTHROPIC_API_KEY=your_claude_key_here
CLAUDE_MODEL=claude-sonnet-4-20250514
```

### `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'data/output/playwright-report.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
```

---

## 2A. Provider Setup: Gemini

### What is Gemini?
Google's AI model, free via Google AI Studio with generous limits (15 requests/minute, 1 million tokens/day).

### Setup Steps

```bash
# 1. Go to https://aistudio.google.com/app/apikey
# 2. Sign in with Google account
# 3. Click "Create API Key"
# 4. Copy into .env:

AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...your_key_here
GEMINI_MODEL=gemini-1.5-flash
```

### Model Recommendation
Use `gemini-1.5-flash` — fast, free, excellent at structured JSON output.
If quality is poor, try `gemini-1.5-pro` (slower but smarter, 2 RPM free).

---

## 2B. Provider Setup: Ollama

### What is Ollama?
Runs AI models **locally on your machine** — completely free, no internet needed after download, full privacy.

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk**: ~5GB for llama3 model
- **OS**: macOS, Windows, or Linux

### Setup Steps

```bash
# Step 1: Install Ollama
# macOS / Linux:
curl -fsSL https://ollama.com/install.sh | sh
# Windows: download installer from https://ollama.com/download

# Step 2: Start Ollama service (keep this terminal open)
ollama serve

# Step 3: Download a model (one-time, pick ONE)
ollama pull llama3      # Best quality, ~4.7GB
ollama pull mistral     # Good quality, ~4.1GB
ollama pull phi3        # Fastest, ~2.3GB (use if machine is slow)

# Step 4: Test it works
ollama run llama3 "Reply with just: hello"

# Step 5: Set .env:
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### Model Options

| Model | Size | Speed | JSON Reliability |
|---|---|---|---|
| `llama3` | 4.7GB | Medium | Good |
| `mistral` | 4.1GB | Fast | Best |
| `phi3` | 2.3GB | Very Fast | Decent |
| `gemma2` | 5.4GB | Medium | Good |

> If you get repeated JSON parse errors, switch to `mistral` — it follows JSON instructions most reliably among local models.

### Important Note
Ollama must be running (`ollama serve`) in a separate terminal **before** you start the app. If you forget, you'll see `ECONNREFUSED` — the `callAI()` wrapper gives a clear error message for this.

---

## 2C. Provider Setup: Claude

```bash
# 1. Go to https://console.anthropic.com
# 2. Sign up and add a payment method
# 3. Go to API Keys → Create new key
# 4. Set .env:

AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...your_key_here
CLAUDE_MODEL=claude-sonnet-4-20250514
```

Running this prototype end-to-end 5–10 times costs approximately **$0.10–$0.50** total.

---

## 3. Core Module: AI Provider Wrapper

**File:** `src/utils/ai.ts`

> This is the most important file. All modules call `callAI()` — they never import provider SDKs directly. Switching providers only requires changing `AI_PROVIDER` in `.env`.

### Cursor Prompt:
> "Implement `src/utils/ai.ts` exactly as specified in the blueprint. It must export `callAI(systemPrompt, userPrompt, maxTokens?)`, `cleanJsonResponse(text)`, and `getProviderInfo()`. Route to Gemini, Ollama, or Claude based on `process.env.AI_PROVIDER`. Include retry logic on rate limit errors and a helpful error message when Ollama is not running."

### Full Implementation

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

type Provider = 'gemini' | 'ollama' | 'claude';

// ── JSON Cleaner (critical for Ollama, helpful for all providers) ──
export function cleanJsonResponse(text: string): string {
  // Strip markdown code fences: ```json...``` or ```...```
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  cleaned = cleaned.trim();
  // If there's text before the JSON starts, strip it
  const jsonStart = cleaned.search(/[\[{]/);
  if (jsonStart > 0) cleaned = cleaned.substring(jsonStart);
  // Trim anything after the last ] or }
  const lastBracket = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  if (lastBracket !== -1 && lastBracket < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBracket + 1);
  }
  return cleaned;
}

// ── Gemini ─────────────────────────────────────────────────────
async function callGemini(system: string, user: string, maxTokens: number): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: { maxOutputTokens: maxTokens },
    systemInstruction: system,
  });
  const result = await model.generateContent(user);
  return result.response.text();
}

// ── Ollama ─────────────────────────────────────────────────────
async function callOllama(system: string, user: string, maxTokens: number): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3';

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { num_predict: maxTokens },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json() as { message: { content: string } };
  return data.message.content;
}

// ── Claude ─────────────────────────────────────────────────────
async function callClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');
  return content.text;
}

// ── Universal callAI ───────────────────────────────────────────
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096
): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'gemini') as Provider;

  const invoke = async (): Promise<string> => {
    switch (provider) {
      case 'gemini': return callGemini(systemPrompt, userPrompt, maxTokens);
      case 'ollama': return callOllama(systemPrompt, userPrompt, maxTokens);
      case 'claude': return callClaude(systemPrompt, userPrompt, maxTokens);
      default: throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Valid options: gemini, ollama, claude`
      );
    }
  };

  try {
    return await invoke();
  } catch (error: any) {
    // Rate limit retry
    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('overloaded') ||
      error?.message?.includes('quota');

    if (isRateLimit) {
      console.warn('\n⚠️  Rate limit hit. Retrying in 5 seconds...');
      await new Promise(res => setTimeout(res, 5000));
      return invoke();
    }

    // Ollama not running
    if (error?.message?.includes('ECONNREFUSED') && provider === 'ollama') {
      throw new Error(
        '\n❌ Cannot connect to Ollama.\n' +
        '   Make sure Ollama is running: open a new terminal and run "ollama serve"\n' +
        '   Then restart this app.'
      );
    }

    throw error;
  }
}

// ── Provider info for startup banner ──────────────────────────
export function getProviderInfo(): { provider: string; model: string } {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const models: Record<string, string> = {
    gemini: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    ollama: process.env.OLLAMA_MODEL || 'llama3',
    claude: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  };
  return { provider, model: models[provider] || 'unknown' };
}
```

---

## 4. Core Module: Test Case Generator

**File:** `src/modules/testCaseGenerator.ts`

### Cursor Prompt:
> "Implement `src/modules/testCaseGenerator.ts`. Read acceptance criteria text, call `callAI()` with the prompts below, clean with `cleanJsonResponse()`, parse as JSON, validate with Zod, and return `TestCase[]`. Retry once with a stricter prompt if JSON parsing fails. Write result to `data/output/generated-test-cases.json`."

### TypeScript Interfaces — put in `src/types.ts`

```typescript
export type TestType = 'UI' | 'API';
export type Priority = 'High' | 'Medium' | 'Low';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface ApiTestDetails {
  method: string;
  endpoint: string;
  requestBody?: Record<string, unknown>;
  expectedStatus: number;
  expectedResponseFields?: string[];
}

export interface TestCase {
  id: string;
  title: string;
  type: TestType;
  priority: Priority;
  description: string;
  preconditions: string[];
  steps: TestStep[];
  expectedOutcome: string;
  tags: string[];
  apiDetails?: ApiTestDetails;
  source: 'generated' | 'manual';
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
}

export interface FailureCategory {
  testId: string;
  testTitle: string;
  category:
    | 'script_locator_issue'
    | 'product_defect'
    | 'environment_issue'
    | 'test_data_issue'
    | 'assertion_mismatch'
    | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  suggestedAction: string;
}

export interface ExecutionResult {
  testId: string;
  testTitle: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  stackTrace?: string;
}

export interface ExecutionReport {
  runAt: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: ExecutionResult[];
}

export interface ScriptFile {
  testId: string;
  filePath: string;
  scriptContent: string;
  approved?: boolean;
}
```

### AI Prompts

```typescript
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

// Retry prompt if first attempt fails JSON parsing:
export const TEST_CASE_RETRY_PROMPT = `Your previous response could not be parsed as JSON.
You MUST respond with ONLY a valid JSON array starting with [ and ending with ].
No text before or after. No markdown. No explanation. Just the raw JSON array.`;
```

---

## 5. Core Module: Manual Test Input Handler

**File:** `src/modules/manualInputHandler.ts`

### Cursor Prompt:
> "Implement `src/modules/manualInputHandler.ts`. Read `data/input/manual-test-cases.json` if it exists (skip silently if not). Validate each entry — id and title are required minimum. Force `source: 'manual'` and `reviewStatus: 'pending'`. Merge with AI-generated test cases, deduplicating by id (manual entries win). Return merged array sorted by id."

### Sample `data/input/manual-test-cases.json`

```json
[
  {
    "id": "TC-M01",
    "title": "Login with special characters in password",
    "type": "UI",
    "priority": "Medium",
    "description": "Verify login works when password contains special characters like !@#$%",
    "preconditions": ["User account exists with special character password"],
    "steps": [
      {
        "stepNumber": 1,
        "action": "Navigate to login page",
        "expectedResult": "Login form is displayed"
      },
      {
        "stepNumber": 2,
        "action": "Enter username 'testuser' and password 'P@ssw0rd!#'",
        "expectedResult": "Credentials entered in fields"
      },
      {
        "stepNumber": 3,
        "action": "Click Login button",
        "expectedResult": "User is successfully logged in"
      }
    ],
    "expectedOutcome": "User with special character password can log in successfully",
    "tags": ["login", "special-characters", "security"],
    "source": "manual",
    "reviewStatus": "pending"
  }
]
```

---

## 6. Core Module: Playwright Script Generator

**File:** `src/modules/scriptGenerator.ts`

### Cursor Prompt:
> "Implement `src/modules/scriptGenerator.ts`. For each approved TestCase, call `callAI()` with the prompts below. The response is TypeScript code (not JSON), so just trim it — do not call `cleanJsonResponse()`. Save each script to `data/output/scripts/{testId}.spec.ts`. Also copy to `tests/{testId}.spec.ts`. Return array of ScriptFile objects."

### AI Prompts

```typescript
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
- baseURL is http://localhost:3000
- Add brief comments on key steps`;

export const scriptUserPrompt = (tc: TestCase): string => `
Generate a complete Playwright TypeScript test for:

Title: ${tc.title}
Type: ${tc.type}
Description: ${tc.description}
Preconditions: ${tc.preconditions.join('; ')}

Steps:
${tc.steps.map(s => `  ${s.stepNumber}. DO: ${s.action}\n     EXPECT: ${s.expectedResult}`).join('\n')}

Final Expected Outcome: ${tc.expectedOutcome}
${tc.apiDetails ? `
API Details:
  Method: ${tc.apiDetails.method}
  Endpoint: ${tc.apiDetails.endpoint}
  Expected HTTP Status: ${tc.apiDetails.expectedStatus}
  Request Body: ${JSON.stringify(tc.apiDetails.requestBody, null, 2)}
  Expected Response Fields: ${tc.apiDetails.expectedResponseFields?.join(', ')}
` : ''}`;
```

---

## 7. Core Module: Human Review Interface (CLI)

**File:** `src/modules/humanReview.ts`

### Cursor Prompt:
> "Implement `src/modules/humanReview.ts` using inquirer v8 and chalk. Export `reviewTestCases(testCases: TestCase[])` and `reviewScripts(scripts: ScriptFile[])`. For test cases: display ID/title/type/priority in colors, show steps, prompt Approve/Reject/Edit/Skip with inquirer list. For scripts: show file path + first 25 lines, then Approve/Reject. Save approved test cases to `data/output/approved-test-cases.json`."

### inquirer patterns to use

```typescript
// Test case action prompt:
const { action } = await inquirer.prompt([{
  type: 'list',
  name: 'action',
  message: `Action for [${tc.id}] ${tc.title}:`,
  choices: [
    { name: '✅  Approve', value: 'approved' },
    { name: '❌  Reject',  value: 'rejected' },
    { name: '✏️   Edit notes', value: 'edit' },
    { name: '⏭️   Skip (keep pending)', value: 'skip' },
  ],
}]);

// If edit:
const { notes } = await inquirer.prompt([{
  type: 'input',
  name: 'notes',
  message: 'Review notes:',
}]);

// Script review prompt:
const { scriptAction } = await inquirer.prompt([{
  type: 'list',
  name: 'scriptAction',
  message: `Script for ${script.testId}:`,
  choices: [
    { name: '✅  Approve script', value: 'approved' },
    { name: '❌  Reject script',  value: 'rejected' },
  ],
}]);
```

---

## 8. Core Module: Execution Report Handler

**File:** `src/modules/reportHandler.ts`

### Cursor Prompt:
> "Implement `src/modules/reportHandler.ts`. Try reading `data/output/playwright-report.json`; if not found fall back to `data/mocks/sample-execution-report.json` with a warning. Parse into ExecutionReport, validate with Zod. Print a chalk-formatted summary (total/passed/failed/skipped with colors). Return only failed ExecutionResult[]."

### Sample `data/mocks/sample-execution-report.json`

```json
{
  "runAt": "2026-04-20T10:30:00Z",
  "totalTests": 8,
  "passed": 5,
  "failed": 3,
  "skipped": 0,
  "results": [
    {
      "testId": "TC-001",
      "testTitle": "Login with valid credentials",
      "status": "passed",
      "duration": 1243
    },
    {
      "testId": "TC-002",
      "testTitle": "Login with invalid password shows error",
      "status": "failed",
      "duration": 3201,
      "error": "Timeout 5000ms exceeded. Element not found: [data-testid='error-message']",
      "stackTrace": "Error: Timeout 5000ms exceeded.\n    at /tests/TC-002.spec.ts:24:18"
    },
    {
      "testId": "TC-003",
      "testTitle": "Login API returns 401 for invalid credentials",
      "status": "failed",
      "duration": 892,
      "error": "expect(received).toBe(expected)\nExpected: 401\nReceived: 500",
      "stackTrace": "Error: expect(received).toBe(expected)\n    at /tests/TC-003.spec.ts:19:5"
    },
    {
      "testId": "TC-004",
      "testTitle": "Empty username field prevents login",
      "status": "passed",
      "duration": 987
    },
    {
      "testId": "TC-005",
      "testTitle": "Locked user sees account locked message",
      "status": "failed",
      "duration": 4102,
      "error": "net::ERR_CONNECTION_REFUSED at http://localhost:3000/login",
      "stackTrace": "Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login"
    },
    {
      "testId": "TC-006",
      "testTitle": "Login API returns 200 with token for valid credentials",
      "status": "passed",
      "duration": 445
    },
    {
      "testId": "TC-007",
      "testTitle": "Password field masks input",
      "status": "passed",
      "duration": 678
    },
    {
      "testId": "TC-008",
      "testTitle": "Remember me checkbox persists session",
      "status": "passed",
      "duration": 1890
    }
  ]
}
```

---

## 9. Core Module: AI Failure Categorizer

**File:** `src/modules/failureCategorizer.ts`

### Cursor Prompt:
> "Implement `src/modules/failureCategorizer.ts`. Send ALL failures in ONE `callAI()` call using the prompts below. Clean with `cleanJsonResponse()`, parse JSON, validate with Zod. Write to `data/output/failure-report.json`. Print a color-coded table: red=product_defect, yellow=environment_issue, blue=script_locator_issue, magenta=test_data_issue, gray=assertion_mismatch."

### AI Prompts

```typescript
export const CATEGORIZER_SYSTEM_PROMPT = `You are a QA analysis expert who categorizes Playwright test failures.

CRITICAL: Respond with ONLY a valid JSON array. No markdown. No code fences.
Start with [ and end with ].

Failure categories:
- script_locator_issue: Wrong selector, outdated locator, or timing bug in test code
- product_defect: Real app bug — the feature does not work as specified
- environment_issue: Network/server/infra problem (ERR_CONNECTION_REFUSED, 500 errors, timeouts)
- test_data_issue: Missing, stale, or wrong test data
- assertion_mismatch: The assertion expectation is wrong but app behavior may be correct

JSON schema per item:
{
  "testId": "TC-001",
  "testTitle": "string",
  "category": "one_of_the_5_categories_or_unknown",
  "confidence": "high | medium | low",
  "reasoning": "1-2 sentence explanation",
  "suggestedAction": "specific concrete next step"
}`;

export const categorizerUserPrompt = (failures: ExecutionResult[]): string =>
  `Categorize these test failures:\n\n${failures.map(f =>
    `ID: ${f.testId}\nTitle: ${f.testTitle}\nError: ${f.error}\nStack: ${f.stackTrace}\nDuration: ${f.duration}ms`
  ).join('\n---\n')}\n\nRemember: respond with ONLY the JSON array.`;
```

---

## 10. Orchestrator / Main Entry Point

**File:** `src/index.ts`

### Cursor Prompt:
> "Implement `src/index.ts`. On startup print a banner showing the active provider/model using `getProviderInfo()`. Show an inquirer main menu. Use `ora` spinners during AI calls. Implement `runFullPipeline()` that runs all steps in sequence, and individual step functions for the menu."

### Startup banner + main menu

```typescript
// Banner output on start:
// ╔══════════════════════════════════════════╗
// ║     AI-Powered QA Lifecycle System       ║
// ║     Provider: gemini (gemini-1.5-flash)  ║
// ╚══════════════════════════════════════════╝

// Main menu choices:
// 1. 🚀  Run Full Pipeline
// 2. 📝  Generate Test Cases from Acceptance Criteria
// 3. 📂  Process & Merge Manual Test Cases
// 4. 👁️   Human Review: Test Cases
// 5. 🤖  Generate Playwright Scripts (from approved cases)
// 6. 👁️   Human Review: Scripts
// 7. 📊  Analyze Execution Report & Categorize Failures
// 8. 🚪  Exit
```

### Full pipeline pseudocode

```typescript
async function runFullPipeline() {
  // 1. Read acceptance criteria
  const criteria = await readTextFile(CONFIG.paths.acceptanceCriteria);

  // 2. Generate test cases
  const spinner1 = ora('Generating test cases with AI...').start();
  const generatedCases = await generateTestCases(criteria);
  spinner1.succeed(`Generated ${generatedCases.length} test cases`);

  // 3. Merge with manual cases
  const allCases = await mergeManualCases(generatedCases);
  logger.info(`Total test cases (generated + manual): ${allCases.length}`);

  // 4. Human review of test cases
  const reviewedCases = await reviewTestCases(allCases);
  const approvedCases = reviewedCases.filter(tc => tc.reviewStatus === 'approved');
  logger.success(`Approved: ${approvedCases.length} test cases`);

  if (approvedCases.length === 0) {
    logger.warn('No test cases approved. Stopping pipeline.');
    return;
  }

  // 5. Generate Playwright scripts
  const spinner2 = ora(`Generating ${approvedCases.length} Playwright scripts...`).start();
  const scripts = await generateScripts(approvedCases);
  spinner2.succeed(`Generated ${scripts.length} scripts`);

  // 6. Human review of scripts
  const approvedScripts = await reviewScripts(scripts);
  logger.success(`Approved: ${approvedScripts.filter(s => s.approved).length} scripts`);

  // 7. Parse execution report
  const failures = await parseExecutionReport();

  if (failures.length === 0) {
    logger.success('No failures in execution report!');
    return;
  }

  // 8. Categorize failures
  const spinner3 = ora(`Categorizing ${failures.length} failures with AI...`).start();
  const categories = await categorizeFailures(failures);
  spinner3.succeed('Failure categorization complete');

  // 9. Print final summary
  printFinalSummary(categories);
}
```

### `src/config.ts`

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  provider: process.env.AI_PROVIDER || 'gemini',
  paths: {
    acceptanceCriteria: 'data/input/acceptance-criteria.md',
    manualTestCases:    'data/input/manual-test-cases.json',
    generatedTestCases: 'data/output/generated-test-cases.json',
    approvedTestCases:  'data/output/approved-test-cases.json',
    scripts:            'data/output/scripts',
    testsDir:           'tests',
    playwrightReport:   'data/output/playwright-report.json',
    mockReport:         'data/mocks/sample-execution-report.json',
    failureReport:      'data/output/failure-report.json',
  },
};
```

---

## 11. Sample Data & Mocks

### `data/input/acceptance-criteria.md`

```markdown
# Feature: User Login

## Acceptance Criteria

1. **Valid Login**: User can log in with valid credentials (correct username and password)
2. **Invalid Credentials**: Invalid username or password should show a clear error message
3. **Mandatory Fields**: Username and password are mandatory; form must not submit if either is empty
4. **Locked Account**: Users with locked accounts cannot log in and see an appropriate message
5. **Login API**: 
   - Returns HTTP 200 with auth token for valid credentials
   - Returns HTTP 401 for invalid credentials
   - Returns HTTP 403 for locked accounts
   - Returns HTTP 400 for malformed requests
6. **Remember Me**: Optional checkbox that extends session duration
7. **Password Masking**: Password field masks characters as typed
8. **Rate Limiting**: After 5 failed attempts, temporarily lock the account
```

### `src/utils/logger.ts`

```typescript
import chalk from 'chalk';

export const logger = {
  info:    (msg: string) => console.log(chalk.blue('ℹ ') + msg),
  success: (msg: string) => console.log(chalk.green('✔ ') + msg),
  warn:    (msg: string) => console.log(chalk.yellow('⚠ ') + msg),
  error:   (msg: string) => console.log(chalk.red('✖ ') + msg),
  header:  (msg: string) => {
    const border = '═'.repeat(msg.length + 4);
    console.log(chalk.cyan(`╔${border}╗`));
    console.log(chalk.cyan(`║  ${chalk.bold(msg)}  ║`));
    console.log(chalk.cyan(`╚${border}╝`));
  },
  divider: () => console.log(chalk.gray('─'.repeat(50))),
};
```

### `src/utils/fileHelpers.ts`

```typescript
// Implement these functions using fs/promises:
// readJsonFile<T>(path: string): Promise<T>
// writeJsonFile(path: string, data: unknown): Promise<void>
// readTextFile(path: string): Promise<string>
// writeTextFile(path: string, content: string): Promise<void>
// ensureDir(path: string): Promise<void>   — use recursive: true
// fileExists(path: string): Promise<boolean>
// All paths relative to process.cwd()
```

---

## 12. README.md Content

### Cursor Prompt:
> "Create `README.md` with the following content."

````markdown
# AI-Powered QA Lifecycle System

A prototype demonstrating how AI supports the QA lifecycle end-to-end.
Supports three AI providers: **Google Gemini** (free), **Ollama** (local/free), **Anthropic Claude** (paid/best).

## Quick Start

### Option A — Google Gemini (Free, Recommended)
```bash
npm install && npx playwright install chromium
cp .env.example .env
# Edit .env: set AI_PROVIDER=gemini, add GEMINI_API_KEY
# Free key at: https://aistudio.google.com/app/apikey
npm start
```

### Option B — Ollama (Fully Local, No API Key)
```bash
# Install Ollama: https://ollama.com
ollama pull llama3        # one-time download ~4.7GB
ollama serve              # run in a separate terminal

npm install && npx playwright install chromium
cp .env.example .env
# Edit .env: set AI_PROVIDER=ollama
npm start
```

### Option C — Anthropic Claude
```bash
npm install && npx playwright install chromium
cp .env.example .env
# Edit .env: set AI_PROVIDER=claude, add ANTHROPIC_API_KEY
# Key at: https://console.anthropic.com (~$0.50 for full prototype run)
npm start
```

## Architecture

[See ASCII diagram in Section 1 of BLUEPRINT.md]

## AI Provider Abstraction

All AI calls route through `src/utils/ai.ts` via `callAI(systemPrompt, userPrompt)`.
Change `AI_PROVIDER` in `.env` to switch providers — zero code changes needed.

## How AI Is Used

**Test Case Generation**: AI reads acceptance criteria → returns structured JSON with UI + API test cases covering happy paths, errors, and edge cases.

**Script Generation**: Each approved test case is sent to AI → returns a complete `.spec.ts` Playwright file with role-based selectors and proper assertions.

**Failure Categorization**: All test failures sent in one AI call → returns category, confidence, reasoning, and suggested action per failure.

## What Is Implemented vs Mocked

| Component | Status |
|---|---|
| AI provider abstraction (Gemini/Ollama/Claude) | ✅ Implemented |
| Test case generation | ✅ Implemented |
| Manual test case merging | ✅ Implemented |
| CLI human review (test cases + scripts) | ✅ Implemented |
| Playwright script generation | ✅ Implemented |
| Execution report parsing | ✅ Implemented |
| AI failure categorization | ✅ Implemented |
| Live app under test | 🔶 Mocked (sample report provided) |
| Actual Playwright test execution | 🔶 Mocked |
````

---

## 13. Design Note

**Create as `DESIGN_NOTE.md`**

### How This Can Scale

1. **Provider flexibility**: Adding a new AI provider means one new `case` in `callAI()` switch — nothing else changes.
2. **Storage**: Replace JSON files with PostgreSQL + Prisma for test case versioning and audit history.
3. **Review UI**: Replace CLI with a Next.js web app for team-wide async review workflows.
4. **CI/CD**: Auto-trigger Playwright on PR, pipe the JSON report directly into the failure categorizer.
5. **RAG improvement**: Store categorized failures in a vector DB so future categorizations can learn from past examples.

### Where Human Validation Is Critical

1. **Test case review**: AI may miss domain context or business rules that only humans know.
2. **Script review before CI**: AI locators are educated guesses — must be verified against the real DOM.
3. **Failure triage**: `product_defect` vs `environment_issue` requires knowing deployment state.
4. **Criteria quality**: Vague acceptance criteria produce vague test cases regardless of AI quality.

### Improvements With More Time

- Confidence scoring per generated test case
- Semantic deduplication using embeddings
- "Coverage gap" analysis: given existing tests, find what's missing
- JIRA/Linear integration to auto-create tickets for `product_defect` failures
- Prompt A/B testing across providers to find best output per task type

---

## 14. Cursor Workflow Tips

### Recommended Build Order

```
1.  src/types.ts
2.  src/config.ts
3.  src/utils/logger.ts
4.  src/utils/fileHelpers.ts
5.  src/utils/ai.ts                  ← Most critical — build carefully
6.  src/modules/testCaseGenerator.ts
7.  src/modules/manualInputHandler.ts
8.  src/modules/humanReview.ts
9.  src/modules/scriptGenerator.ts
10. src/modules/reportHandler.ts
11. src/modules/failureCategorizer.ts
12. src/index.ts
13. data/input/acceptance-criteria.md
14. data/input/manual-test-cases.json
15. data/mocks/sample-execution-report.json
```

### Effective Cursor Prompts

```
"Implement [filename] following BLUEPRINT.md Section [N].
Import types from src/types.ts and callAI/cleanJsonResponse from src/utils/ai.ts.
Add JSDoc comments. Handle all errors with descriptive messages."
```

### Provider-Specific Gotchas

**Gemini:**
- Occasionally wraps JSON in markdown fences — `cleanJsonResponse()` handles this automatically
- If you hit quota, switch `GEMINI_MODEL` to `gemini-1.5-pro`

**Ollama:**
- Must have `ollama serve` running in a separate terminal before starting the app
- Expect 10–30 seconds per AI call (it's running locally)
- If JSON parsing keeps failing, add to the user prompt: `"YOUR ENTIRE RESPONSE MUST BE ONLY THE JSON ARRAY."`
- Switch to `mistral` if `llama3` gives inconsistent JSON

**Claude:**
- Most reliable JSON output — least likely to need retries
- `overloaded_error` is handled automatically by the retry in `callAI()`

### CommonJS Version Pins — Do Not Change

```
inquirer   → v8   (v9 is ESM only, breaks ts-node)
chalk      → v4   (v5 is ESM only)
ora        → v5   (v6 is ESM only)
node-fetch → v2   (v3 is ESM only)
```

---

*Blueprint version 2.0 — April 2026 — Multi-provider edition*  
*Supports: Google Gemini (free) · Ollama (local) · Anthropic Claude (paid)*  
*Built for use with Cursor AI editor*
