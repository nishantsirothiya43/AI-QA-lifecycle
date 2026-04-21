import * as dotenv from 'dotenv';

type AIProvider = 'gemini' | 'ollama' | 'claude';

export type AppConfig = {
  aiProvider: AIProvider;
  gemini: { apiKey: string; model: string };
  ollama: { baseUrl: string; model: string };
  claude: { apiKey: string; model: string };
  paths: { inputDir: string; outputDir: string; mockDir: string };
};

function parseProvider(raw: string | undefined): AIProvider {
  if (raw === 'ollama' || raw === 'claude' || raw === 'gemini') return raw;
  return 'gemini';
}

function buildConfigFromEnv(): AppConfig {
  return {
    aiProvider: parseProvider(process.env.AI_PROVIDER),
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? '',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL ?? 'llama3',
    },
    claude: {
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
      model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514',
    },
    paths: {
      inputDir: 'data/input',
      outputDir: 'data/output',
      mockDir: 'data/mocks',
    },
  };
}

export const CONFIG: AppConfig = buildConfigFromEnv();

export function refreshConfigFromEnv(): AppConfig {
  // Ensure local `.env` wins over any pre-set shell/IDE environment variables.
  dotenv.config({ override: true });
  const latest = buildConfigFromEnv();
  CONFIG.aiProvider = latest.aiProvider;
  CONFIG.gemini = latest.gemini;
  CONFIG.ollama = latest.ollama;
  CONFIG.claude = latest.claude;
  CONFIG.paths = latest.paths;
  return CONFIG;
}

refreshConfigFromEnv();
