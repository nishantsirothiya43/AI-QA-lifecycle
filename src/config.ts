import * as dotenv from 'dotenv';

// Ensure local `.env` wins over any pre-set shell/IDE environment variables.
dotenv.config({ override: true });

type AIProvider = 'gemini' | 'ollama' | 'claude';

const rawProvider = process.env.AI_PROVIDER;
const aiProvider: AIProvider =
  rawProvider === 'ollama' || rawProvider === 'claude' || rawProvider === 'gemini'
    ? rawProvider
    : 'gemini';

const geminiApiKey = process.env.GEMINI_API_KEY ?? '';
const claudeApiKey = process.env.ANTHROPIC_API_KEY ?? '';

export const CONFIG = {
  aiProvider,
  gemini: {
    apiKey: geminiApiKey,
    // Default to a widely-available Gemini Flash model for `generateContent`.
    // Older IDs like `gemini-1.5-flash` may no longer be exposed for new keys/projects.
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL ?? 'llama3',
  },
  claude: {
    apiKey: claudeApiKey,
    model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514',
  },
  paths: {
    inputDir: 'data/input',
    outputDir: 'data/output',
    mockDir: 'data/mocks',
  },
} as const;
