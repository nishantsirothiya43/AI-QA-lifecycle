import * as dotenv from 'dotenv';
import dns from 'dns';
import fetch from 'node-fetch';
import { execFile } from 'child_process';
import { promisify } from 'util';

// `ai.ts` is sometimes imported without going through `config.ts` first.
// Keep dotenv behavior consistent: local `.env` should win.
dotenv.config({ override: true });

import { CONFIG, refreshConfigFromEnv } from '../config';

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
const execFileAsync = promisify(execFile);

function effectiveMaxTokens(provider: 'gemini' | 'ollama' | 'claude', requested: number): number {
  const safeRequested = Number.isFinite(requested) ? Math.max(64, Math.floor(requested)) : 512;
  if (provider !== 'claude') {
    return safeRequested;
  }

  // Budget-friendly default for small Claude TPM plans.
  // Can be overridden via env without code changes.
  const envValue = Number.parseInt(process.env.CLAUDE_MAX_OUTPUT_TOKENS ?? '', 10);
  const defaultCap = Number.isFinite(envValue) && envValue > 0 ? envValue : 700;
  const cap = Math.max(128, Math.min(1200, defaultCap));
  return Math.min(safeRequested, cap);
}

function isDnsErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('enotfound') ||
    lower.includes('eai_again') ||
    lower.includes('getaddrinfo')
  );
}

async function callGeminiViaCurl(url: string, payload: string, timeoutMs: number): Promise<GeminiGenerateResponse> {
  const timeoutSec = Math.max(1, Math.ceil(timeoutMs / 1000));
  const { stdout } = await execFileAsync('curl', [
    '--silent',
    '--show-error',
    '--max-time',
    String(timeoutSec),
    '--request',
    'POST',
    '--header',
    'Content-Type: application/json',
    '--data',
    payload,
    url,
  ]);

  return JSON.parse(stdout) as GeminiGenerateResponse;
}

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
  refreshConfigFromEnv();
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

    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });

    let response: Awaited<ReturnType<typeof fetch>> | null = null;
    let data: GeminiGenerateResponse;
    try {
      response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        },
        PROVIDER_TIMEOUTS_MS.gemini
      );
      data = (await response.json()) as GeminiGenerateResponse;
    } catch (networkError: unknown) {
      const networkMessage =
        networkError instanceof Error ? networkError.message : String(networkError);
      if (!isDnsErrorMessage(networkMessage)) {
        throw networkError instanceof Error ? networkError : new Error(networkMessage);
      }
      console.warn(`[AI][Gemini] Node fetch DNS issue for ${modelName}. Falling back to curl transport.`);
      data = await callGeminiViaCurl(url, payload, PROVIDER_TIMEOUTS_MS.gemini);
    }

    if (response && !response.ok) {
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

    if (data.error?.message) {
      // Handles curl fallback responses where we don't have HTTP status.
      const apiMessage = data.error.message;
      lastErrorMessage = apiMessage;
      const lower = apiMessage.toLowerCase();
      const maybeWrongModel =
        lower.includes('not found') ||
        lower.includes('not supported') ||
        lower.includes('does not exist');
      const maybeQuota =
        lower.includes('quota') ||
        lower.includes('exceeded your current quota') ||
        lower.includes('resource exhausted');
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
    const targetUrlMatch = combined.match(/Target URL:\s*(\S+)/i);
    const targetUrl = (targetUrlMatch?.[1] ?? 'https://demo.playwright.dev/todomvc/').trim();
    return `import { test, expect } from '@playwright/test';

test.describe('Smoke check for configured target URL', () => {
  test('should load target URL', async ({ page }) => {
    await page.goto('${targetUrl}', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*/);
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
  refreshConfigFromEnv();
  assertProviderCredentials();

  const invoke = async (requestedTokens: number): Promise<string> => {
    const tokens = effectiveMaxTokens(CONFIG.aiProvider, requestedTokens);
    if (CONFIG.aiProvider === 'claude' && isMockMode()) {
      return callClaudeMock(systemPrompt, userPrompt);
    }

    switch (CONFIG.aiProvider) {
      case 'gemini':
        return callGemini(systemPrompt, userPrompt, tokens);
      case 'ollama':
        return callOllama(systemPrompt, userPrompt, tokens);
      case 'claude':
        return callClaudeAnthropic(systemPrompt, userPrompt, tokens);
      default:
        throw new Error(`Unsupported AI provider: ${String(CONFIG.aiProvider)}`);
    }
  };

  try {
    return await invoke(maxTokens);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    const message = err instanceof Error ? err.message : String(error);

    const lowerMessage = message.toLowerCase();
    const isRateLimit =
      err?.status === 429 ||
      message.includes('429') ||
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('would exceed') ||
      lowerMessage.includes('tokens per minute') ||
      lowerMessage.includes('overloaded') ||
      lowerMessage.includes('high demand') ||
      lowerMessage.includes('temporarily unavailable');

    if (isRateLimit) {
      // For Claude low-TPM plans, retrying with the same token budget usually fails again.
      // Reduce max output progressively to stay under org TPM while preserving existing flow.
      const first = effectiveMaxTokens(CONFIG.aiProvider, maxTokens);
      const retryBudgets = [Math.max(192, Math.floor(first * 0.6)), Math.max(128, Math.floor(first * 0.35))];
      for (const retryTokens of retryBudgets) {
        console.warn(`[AI] Rate limit hit; retrying in 12s with max_tokens=${retryTokens}...`);
        await new Promise((res) => setTimeout(res, 12_000));
        try {
          return await invoke(retryTokens);
        } catch (retryError: unknown) {
          const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
          const retryLower = retryMessage.toLowerCase();
          const stillRateLimited =
            retryMessage.includes('429') ||
            retryLower.includes('rate limit') ||
            retryLower.includes('would exceed') ||
            retryLower.includes('tokens per minute') ||
            retryLower.includes('overloaded') ||
            retryLower.includes('high demand') ||
            retryLower.includes('temporarily unavailable');
          if (!stillRateLimited) {
            throw retryError instanceof Error ? retryError : new Error(retryMessage);
          }
        }
      }
      throw new Error(
        'Provider rate limit exceeded repeatedly. Try again in a minute, reduce request size, or lower CLAUDE_MAX_OUTPUT_TOKENS in .env.'
      );
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

    const isDnsResolutionIssue = isDnsErrorMessage(message);

    if (isDnsResolutionIssue && CONFIG.aiProvider === 'gemini') {
      // Transient DNS issues are common on unstable networks/VPN transitions.
      console.warn('[AI][Gemini] DNS resolution failed. Retrying in 3 seconds...');
      await new Promise((res) => setTimeout(res, 3_000));
      try {
        return await invoke(maxTokens);
      } catch (retryError: unknown) {
        const secondMessage = retryError instanceof Error ? retryError.message : String(retryError);
        const secondLower = secondMessage.toLowerCase();
        const stillDnsIssue = isDnsErrorMessage(secondLower);

        if (stillDnsIssue) {
          try {
            // Fallback resolvers when local DNS intermittently fails for Node processes.
            dns.setServers(['8.8.8.8', '1.1.1.1']);
            console.warn('[AI][Gemini] Switched Node DNS servers to 8.8.8.8/1.1.1.1. Retrying...');
            return await invoke(maxTokens);
          } catch (dnsRetryError: unknown) {
            const retryMessage =
              dnsRetryError instanceof Error ? dnsRetryError.message : String(dnsRetryError);
            throw new Error(
              'Unable to reach Gemini API host (DNS resolution failure).\n' +
                '- Check internet connectivity.\n' +
                '- Disable/reconnect VPN or corporate proxy if active.\n' +
                '- Verify DNS works for generativelanguage.googleapis.com from your machine.\n' +
                '- Temporary fallback: set AI_PROVIDER=ollama (with local model) or AI_PROVIDER=claude with MOCK_LLM=true.\n' +
                `Original error: ${retryMessage}`
            );
          }
        }

        throw retryError instanceof Error ? retryError : new Error(secondMessage);
      }
    }

    console.error(`[AI] callAI failed for provider "${CONFIG.aiProvider}": ${message}`);
    throw error instanceof Error ? error : new Error(message);
  }
}
