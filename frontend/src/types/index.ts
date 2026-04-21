export type TestType = 'UI' | 'API';
export type Priority = 'High' | 'Medium' | 'Low';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';
export type AIProvider = 'gemini' | 'ollama' | 'claude';

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

export interface ScriptFile {
  testId: string;
  filePath: string;
  scriptContent: string;
  approved?: boolean;
}

export interface ExecutionResult {
  testId: string;
  testTitle: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  stackTrace?: string;
}

export type FailureCategoryType =
  | 'script_locator_issue'
  | 'product_defect'
  | 'environment_issue'
  | 'test_data_issue'
  | 'assertion_mismatch'
  | 'unknown';

export interface FailureCategory {
  testId: string;
  testTitle: string;
  category: FailureCategoryType;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  suggestedAction: string;
}

export interface ExecutionReport {
  runAt: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: ExecutionResult[];
}

export interface PipelineStatus {
  provider: AIProvider;
  model: string;
  totalGenerated: number;
  totalApproved: number;
  totalScripts: number;
  lastRun: string | null;
}

export interface FrontendInputState {
  targetUrl: string;
  acceptanceCriteria: string;
  updatedAt: string | null;
}

export interface ProviderConfig {
  aiProvider: AIProvider;
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
}

export interface UiSnapshot {
  status: PipelineStatus;
  frontendInput: FrontendInputState;
  testCases: TestCase[];
  scripts: ScriptFile[];
  failures: FailureCategory[];
  executionReport: ExecutionReport | null;
  pipelineWarnings?: string[];
}
