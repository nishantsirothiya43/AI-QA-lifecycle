import type { TestCase } from '../types';

function safeString(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function safeSteps(value: unknown): Array<{ stepNumber: number; action: string; expectedResult: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, index) => {
      const step = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const n = step.stepNumber;
      const stepNumber =
        typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : index + 1;
      return {
        stepNumber,
        action: safeString(step.action, ''),
        expectedResult: safeString(step.expectedResult, ''),
      };
    })
    .filter((s) => s.action.length > 0 || s.expectedResult.length > 0);
}

/**
 * Read-only, plain-language view of a test case. Safe with partial or unexpected API data.
 */
export function TestCasePlainDetails({ tc }: { tc: TestCase }) {
  const caseKey = safeString(tc.id, 'case');
  const description = safeString(tc.description, 'No description provided.');
  const expectedOutcome = safeString(tc.expectedOutcome, 'Not specified.');
  const preconditions = safeStringArray(tc.preconditions);
  const tags = safeStringArray(tc.tags);
  const steps = safeSteps(tc.steps);
  const reviewNotes =
    typeof tc.reviewNotes === 'string' && tc.reviewNotes.trim().length > 0 ? tc.reviewNotes.trim() : null;

  const api = tc.type === 'API' && tc.apiDetails && typeof tc.apiDetails === 'object' ? tc.apiDetails : null;

  return (
    <div style={{ display: 'grid', gap: 12, fontSize: 14, lineHeight: 1.5 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
          What we are checking
        </div>
        <div style={{ marginTop: 4 }}>{description}</div>
      </div>

      {preconditions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
            Before you start
          </div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            {preconditions.map((line, i) => (
              <li key={`${caseKey}-pre-${i}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
          Steps
        </div>
        {steps.length === 0 ? (
          <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>No steps listed for this test.</div>
        ) : (
          <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            {steps.map((step, i) => (
              <li key={`${caseKey}-step-${step.stepNumber}-${i}`} style={{ marginBottom: 8 }}>
                <div>{step.action || '(No action text)'}</div>
                {step.expectedResult ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                    Expected: {step.expectedResult}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
          When we are done
        </div>
        <div style={{ marginTop: 4 }}>{expectedOutcome}</div>
      </div>

      {tags.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
            Tags
          </div>
          <div style={{ marginTop: 4 }}>{tags.join(', ')}</div>
        </div>
      )}

      {api && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
            API check
          </div>
          <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            {safeString(api.method, 'GET')} {safeString(api.endpoint, '/')}
            {' — '}
            expect HTTP {typeof api.expectedStatus === 'number' ? api.expectedStatus : 'status'}
          </div>
        </div>
      )}

      {reviewNotes && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
            Review notes
          </div>
          <div style={{ marginTop: 4 }}>{reviewNotes}</div>
        </div>
      )}
    </div>
  );
}
