import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// `ai.ts` is sometimes imported without going through `config.ts` first.
// Keep dotenv behavior consistent: local `.env` should win.
dotenv.config({ override: true });

import { CONFIG } from '../config';

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

type AnthropicMessagesResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

const PROVIDER_TIMEOUTS_MS = {
  gemini: 60_000,
  ollama: 180_000,
  claude: 60_000,
} as const;

async function fetchWithTimeout(
  url: string,
  init: Parameters<typeof fetch>[1],
  timeoutMs: number
): Promise<Awaited<ReturnType<typeof fetch>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  cleaned = cleaned.trim();

  const jsonStart = cleaned.search(/[\[{]/);
  if (jsonStart > 0) cleaned = cleaned.substring(jsonStart);

  const lastBracket = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  if (lastBracket !== -1 && lastBracket < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBracket + 1);
  }

  return cleaned;
}

export function getProviderInfo(): { provider: string; model: string } {
  const provider = CONFIG.aiProvider;
  const models: Record<string, string> = {
    gemini: CONFIG.gemini.model,
    ollama: CONFIG.ollama.model,
    claude: CONFIG.claude.model,
  };

  return { provider, model: models[provider] ?? 'unknown' };
}

function isMockMode(): boolean {
  return (process.env.MOCK_LLM ?? '').toLowerCase() === 'true';
}

function assertProviderCredentials(): void {
  if (isMockMode()) return;

  if (CONFIG.aiProvider === 'gemini' && !CONFIG.gemini.apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Set it in your .env file when AI_PROVIDER=gemini.');
  }

  if (CONFIG.aiProvider === 'claude' && !CONFIG.claude.apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY. Set it in your .env file when AI_PROVIDER=claude.');
  }
}

async function callGemini(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const { apiKey, model } = CONFIG.gemini;

  const preferredModels = [
    model,
    // Newer Flash models (availability varies by account / region / free tier)
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.5-pro',
  ];

  const modelsToTry = [...new Set(preferredModels.filter(Boolean))];

  let lastErrorMessage = 'Unknown Gemini error';

  for (const modelName of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchWithTimeout(
      url,
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
      },
      PROVIDER_TIMEOUTS_MS.gemini
    );

    const data = (await response.json()) as GeminiGenerateResponse;

    if (!response.ok) {
      const apiMessage = data.error?.message ?? `HTTP ${response.status}`;
      lastErrorMessage = apiMessage;

      const lower = apiMessage.toLowerCase();
      const maybeWrongModel =
        lower.includes('not found') ||
        lower.includes('not supported') ||
        lower.includes('does not exist') ||
        response.status === 404;
      const maybeQuota =
        lower.includes('quota') ||
        lower.includes('exceeded your current quota') ||
        lower.includes('resource exhausted') ||
        response.status === 429;

      console.error(`[AI][Gemini] API request failed (${modelName}): ${apiMessage}`);

      if ((maybeWrongModel || maybeQuota) && modelName !== modelsToTry[modelsToTry.length - 1]) {
        console.warn(`[AI][Gemini] Retrying with a different Gemini model...`);
        continue;
      }

      throw new Error(`Gemini API failed: ${apiMessage}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      lastErrorMessage = 'Gemini API returned an empty response.';
      console.error(`[AI][Gemini] Empty response text from model (${modelName})`);
      continue;
    }

    if (modelName !== model) {
      console.warn(`[AI][Gemini] Note: GEMINI_MODEL="${model}" failed; succeeded using "${modelName}".`);
    }

    return text;
  }

  throw new Error(`Gemini API failed after trying models: ${modelsToTry.join(', ')}. Last error: ${lastErrorMessage}`);
}

async function callOllama(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const { baseUrl, model } = CONFIG.ollama;
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;

  const response = await fetchWithTimeout(
    url,
    {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { num_predict: maxTokens },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    },
    PROVIDER_TIMEOUTS_MS.ollama
  );

  const data = (await response.json()) as OllamaChatResponse;

  if (!response.ok) {
    const apiMessage = data.error ?? `HTTP ${response.status}`;
    console.error(`[AI][Ollama] API request failed: ${apiMessage}`);
    throw new Error(`Ollama API failed: ${apiMessage}`);
  }

  const text = data.message?.content?.trim();
  if (!text) {
    console.error('[AI][Ollama] Empty response text from model');
    throw new Error('Ollama API returned an empty response.');
  }

  return text;
}

async function callClaudeAnthropic(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const { apiKey, model } = CONFIG.claude;
  const url = 'https://api.anthropic.com/v1/messages';

  const response = await fetchWithTimeout(
    url,
    {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    },
    PROVIDER_TIMEOUTS_MS.claude
  );

  const data = (await response.json()) as AnthropicMessagesResponse;

  if (!response.ok) {
    const apiMessage = data.error?.message ?? `HTTP ${response.status}`;
    console.error(`[AI][Claude] API request failed: ${apiMessage}`);

    const lower = apiMessage.toLowerCase();
    const looksLikeBadKey =
      response.status === 401 ||
      lower.includes('invalid x-api-key') ||
      lower.includes('authentication') ||
      lower.includes('unauthorized');

    if (looksLikeBadKey) {
      throw new Error(
        'Anthropic API rejected your API key (invalid/unauthorized).\n' +
          '- If you intend to use Gemini: set AI_PROVIDER=gemini in your .env and ensure GEMINI_API_KEY is set.\n' +
          '- If you intend to use Claude: fix ANTHROPIC_API_KEY in your .env (no quotes/spaces; correct key for Anthropic).\n' +
          '- For offline demos: set MOCK_LLM=true (Claude mock only applies when AI_PROVIDER=claude).'
      );
    }

    throw new Error(`Claude API failed: ${apiMessage}`);
  }

  const textBlock = data.content?.find((c) => c.type === 'text' && c.text)?.text?.trim();
  if (!textBlock) {
    console.error('[AI][Claude] Empty response text from model');
    throw new Error('Claude API returned an empty response.');
  }

  return textBlock;
}

async function callClaudeMock(systemPrompt: string, userPrompt: string): Promise<string> {
  const modelName = CONFIG.claude.model;
  const combined = `${systemPrompt}\n${userPrompt}`;

  const asksForJsonArray = /json\s+array/i.test(combined);
  const asksForPlaywrightScript =
    /@playwright\/test/i.test(combined) || /playwright test script/i.test(combined);
  const asksForJsonObject =
    /ONLY a JSON object/i.test(combined) ||
    /Required output schema:/i.test(combined) ||
    /respond with ONLY a JSON object/i.test(combined);

  if (asksForJsonArray) {
    const mockCases = [
      {
        id: 'TC-001',
        title: 'Login with valid credentials',
        type: 'UI',
        priority: 'High',
        description: 'Verify that a valid user can log in successfully.',
        preconditions: ['User account exists and is active'],
        steps: [
          {
            stepNumber: 1,
            action: 'Open the login page and enter valid username and password',
            expectedResult: 'Credentials are accepted by the form',
          },
          {
            stepNumber: 2,
            action: 'Click the login button',
            expectedResult: 'User is redirected to the dashboard',
          },
        ],
        expectedOutcome: 'User is authenticated and lands on the dashboard.',
        tags: ['login', 'smoke'],
      },
      {
        id: 'TC-002',
        title: 'Login with invalid credentials shows error',
        type: 'UI',
        priority: 'Medium',
        description: 'Verify invalid credentials show a clear error message.',
        preconditions: ['Login page is accessible'],
        steps: [
          {
            stepNumber: 1,
            action: 'Enter invalid username/password and submit',
            expectedResult: 'Login request is processed',
          },
          {
            stepNumber: 2,
            action: 'Observe authentication response',
            expectedResult: 'Error message is displayed to the user',
          },
        ],
        expectedOutcome: 'User remains on login page with a visible error.',
        tags: ['login', 'negative'],
      },
    ];

    return JSON.stringify(mockCases);
  }

  if (asksForPlaywrightScript) {
    return `import { test, expect } from '@playwright/test';

test.describe('Demo TodoMVC (public prototype target)', () => {
  test('should add a todo item', async ({ page }) => {
    // Playwright-hosted TodoMVC demo (no local server required).
    await page.goto('/todomvc/', { waitUntil: 'domcontentloaded' });

    // The demo mounts React after downloading bundle.js; wait for the classic TodoMVC input.
    const input = page.locator('input.new-todo');
    await expect(input).toBeVisible({ timeout: 30_000 });

    await input.fill('Prototype smoke task');
    await input.press('Enter');

    await expect(page.locator('.todo-list li .view label', { hasText: 'Prototype smoke task' })).toBeVisible({
      timeout: 30_000,
    });
  });
});`;
  }

  if (asksForJsonObject) {
    const errorMatch = combined.match(/Error:\s*([\s\S]*?)(?:\n\n|$)/i);
    const errorText = (errorMatch?.[1] ?? '').trim();

    const lower = errorText.toLowerCase();
    let category = 'assertion issue';
    let confidence = 0.65;
    let reasoning = 'Mock analysis: inferred category from failure text.';
    let suggestedAction = 'Review the failure output and update the test or application accordingly.';

    if (lower.includes('net::err_') || lower.includes('econnrefused') || lower.includes('dns')) {
      category = 'network issue';
      confidence = 0.85;
      reasoning = 'Mock analysis: network-related error detected in failure text.';
      suggestedAction = 'Verify the app is running and reachable at the expected URL/port.';
    } else if (
      lower.includes('timeout') ||
      lower.includes('waiting for locator') ||
      lower.includes('element is not visible')
    ) {
      category = 'timing issue';
      confidence = 0.75;
      reasoning = 'Mock analysis: timeout/visibility symptoms often indicate timing or unstable UI.';
      suggestedAction = 'Stabilize the UI state and prefer robust locators/assertions over fixed waits.';
    } else if (
      lower.includes('strict mode violation') ||
      lower.includes('locator resolved to') ||
      lower.includes('selector')
    ) {
      category = 'locator issue';
      confidence = 0.8;
      reasoning = 'Mock analysis: locator ambiguity or resolution issues detected.';
      suggestedAction = 'Tighten locators (role/text/label) and ensure unique targeting.';
    } else if (lower.includes('expect(') || lower.includes('assertion') || lower.includes('received')) {
      category = 'assertion issue';
      confidence = 0.7;
      reasoning = 'Mock analysis: assertion mismatch detected in failure text.';
      suggestedAction = 'Compare expected vs actual behavior; update assertions if expectations are wrong.';
    }

    return JSON.stringify({
      category,
      confidence,
      reasoning,
      suggestedAction,
    });
  }

  return `[Claude mock: ${modelName}] Placeholder response for prompt: ${userPrompt.slice(0, 120)}`;
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096
): Promise<string> {
  assertProviderCredentials();

  const invoke = async (): Promise<string> => {
    if (CONFIG.aiProvider === 'claude' && isMockMode()) {
      return callClaudeMock(systemPrompt, userPrompt);
    }

    switch (CONFIG.aiProvider) {
      case 'gemini':
        return callGemini(systemPrompt, userPrompt, maxTokens);
      case 'ollama':
        return callOllama(systemPrompt, userPrompt, maxTokens);
      case 'claude':
        return callClaudeAnthropic(systemPrompt, userPrompt, maxTokens);
      default:
        throw new Error(`Unsupported AI provider: ${String(CONFIG.aiProvider)}`);
    }
  };

  try {
    return await invoke();
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    const message = err instanceof Error ? err.message : String(error);

    const lowerMessage = message.toLowerCase();
    const isRateLimit =
      err?.status === 429 ||
      message.includes('429') ||
      lowerMessage.includes('overloaded') ||
      lowerMessage.includes('high demand') ||
      lowerMessage.includes('temporarily unavailable');

    if (isRateLimit) {
      console.warn('[AI] Provider under load. Retrying in 10 seconds...');
      await new Promise((res) => setTimeout(res, 10_000));
      return invoke();
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `AI request timed out after waiting for provider response (${CONFIG.aiProvider}). ` +
          'Try again with a shorter input or a smaller/faster model.'
      );
    }

    if (message.includes('ECONNREFUSED') && CONFIG.aiProvider === 'ollama') {
      throw new Error(
        'Cannot connect to Ollama. Make sure Ollama is running (typically `ollama serve`) and OLLAMA_BASE_URL is correct.'
      );
    }

    console.error(`[AI] callAI failed for provider "${CONFIG.aiProvider}": ${message}`);
    throw error instanceof Error ? error : new Error(message);
  }
}
