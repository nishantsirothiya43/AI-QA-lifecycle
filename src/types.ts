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

export interface ScriptFile {
  testId: string;
  filePath: string;
  scriptContent: string;
  approved?: boolean;
}
