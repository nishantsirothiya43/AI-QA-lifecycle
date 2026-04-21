import type {
  FrontendInputState,
  PipelineStatus,
  ProviderConfig,
  TestCase,
  UiSnapshot,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    if (response.status === 404 && path.includes('/api/provider-config')) {
      throw new Error(
        'Provider settings API is unavailable on the running backend. Run `npm run api:restart` in project root and retry.'
      );
    }
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  getSnapshot: async (): Promise<UiSnapshot> => request<UiSnapshot>('/api/snapshot'),

  getStatus: async (): Promise<PipelineStatus> => {
    const snapshot = await request<UiSnapshot>('/api/snapshot');
    return snapshot.status;
  },

  getTestCases: async (): Promise<TestCase[]> => {
    const snapshot = await request<UiSnapshot>('/api/snapshot');
    return snapshot.testCases;
  },

  updateTestCase: async (id: string, patch: Partial<TestCase>): Promise<TestCase> => {
    const snapshot = await request<UiSnapshot>('/api/snapshot');
    const index = snapshot.testCases.findIndex((testCase) => testCase.id === id);
    if (index === -1) throw new Error(`Test case not found: ${id}`);
    const updatedCases = [...snapshot.testCases];
    updatedCases[index] = { ...updatedCases[index], ...patch };
    const nextSnapshot = await request<UiSnapshot>('/api/review/apply', {
      method: 'POST',
      body: JSON.stringify({ testCases: updatedCases }),
    });
    return nextSnapshot.testCases[index];
  },

  generateTestCases: async (): Promise<UiSnapshot> => request<UiSnapshot>('/api/generate-test-cases', { method: 'POST' }),

  applyReview: async (testCases: TestCase[]): Promise<UiSnapshot> =>
    request<UiSnapshot>('/api/review/apply', {
      method: 'POST',
      body: JSON.stringify({ testCases }),
    }),

  getScripts: async () => {
    const snapshot = await request<UiSnapshot>('/api/snapshot');
    return snapshot.scripts;
  },

  generateScripts: async (): Promise<UiSnapshot> => request<UiSnapshot>('/api/generate-scripts', { method: 'POST' }),

  runTests: async (): Promise<UiSnapshot> => request<UiSnapshot>('/api/run-tests', { method: 'POST' }),

  categorizeFailures: async (): Promise<UiSnapshot> =>
    request<UiSnapshot>('/api/analyze-failures', { method: 'POST' }),

  runFullPipeline: async (): Promise<UiSnapshot> =>
    request<UiSnapshot>('/api/run-full-pipeline', { method: 'POST' }),

  importTestCases: async (payload: unknown, mode: 'merge' | 'replace' = 'merge'): Promise<UiSnapshot> => {
    const body =
      Array.isArray(payload)
        ? { mode, testCases: payload }
        : { ...(payload as Record<string, unknown>), mode };
    return request<UiSnapshot>('/api/test-cases/import', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  importExecutionReport: async (body: unknown): Promise<UiSnapshot> =>
    request<UiSnapshot>('/api/execution-report/import', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  setScriptApproval: async (testId: string, approved: boolean): Promise<UiSnapshot> =>
    request<UiSnapshot>('/api/scripts/approval', {
      method: 'POST',
      body: JSON.stringify({ testId, approved }),
    }),

  getFailures: async () => {
    const snapshot = await request<UiSnapshot>('/api/snapshot');
    return snapshot.failures;
  },

  getFrontendInput: async (): Promise<FrontendInputState> => {
    const snapshot = await request<UiSnapshot>('/api/snapshot');
    return snapshot.frontendInput;
  },

  saveFrontendInput: async (input: FrontendInputState): Promise<UiSnapshot> =>
    request<UiSnapshot>('/api/context', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getProviderConfig: async (): Promise<ProviderConfig> =>
    request<ProviderConfig>('/api/provider-config'),

  saveProviderConfig: async (config: ProviderConfig): Promise<ProviderConfig> =>
    request<ProviderConfig>('/api/provider-config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
};
