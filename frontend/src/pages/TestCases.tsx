import { useEffect, useState } from 'react';
import { TestCasePlainDetails } from '../components/TestCasePlainDetails';
import { api } from '../api/client';
import type { TestCase } from '../types';

export default function TestCases() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [importBusy, setImportBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [manualId, setManualId] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<'UI' | 'API'>('UI');
  const [manualPriority, setManualPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [manualDescription, setManualDescription] = useState('');
  const [manualPreconditions, setManualPreconditions] = useState('');
  const [manualSteps, setManualSteps] = useState('');
  const [manualExpectedOutcome, setManualExpectedOutcome] = useState('');
  const [manualTags, setManualTags] = useState('');
  const [manualApiMethod, setManualApiMethod] = useState('GET');
  const [manualApiEndpoint, setManualApiEndpoint] = useState('');
  const [manualApiExpectedStatus, setManualApiExpectedStatus] = useState('200');
  const [detailOpenById, setDetailOpenById] = useState<Record<string, boolean>>({});

  async function loadCases() {
    setLoading(true);
    await api
      .getTestCases()
      .then(setCases)
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadCases();
  }, []);

  async function onGenerate() {
    setMessage('');
    setLoading(true);
    api
      .generateTestCases()
      .then((snapshot) => {
        setCases(snapshot.testCases);
        setMessage(`Generated ${snapshot.testCases.length} test cases.`);
      })
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        setMessage(`Generation failed: ${text}`);
      })
      .finally(() => setLoading(false));
  }

  async function onLoadTemplateFromCurrent() {
    setMessage('');
    try {
      const list = await api.getTestCases();
      setImportText(JSON.stringify(list, null, 2));
      setMessage('Loaded current test cases as JSON template (same shape as data/output/test-cases.json).');
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Could not load template: ${text}`);
    }
  }

  async function onImportManual() {
    setMessage('');
    setImportBusy(true);
    try {
      const parsed = JSON.parse(importText) as unknown;
      const snapshot = await api.importTestCases(parsed, importMode);
      setCases(snapshot.testCases);
      setMessage(
        importMode === 'replace'
          ? `Imported ${snapshot.testCases.length} test cases (replaced).`
          : `Imported/merged. Total test cases: ${snapshot.testCases.length}.`
      );
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Import failed: ${text}`);
    } finally {
      setImportBusy(false);
    }
  }

  function parseLines(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function parseStepsFromText(text: string) {
    return parseLines(text).map((line, index) => {
      const [action, expectedResult] = line.split('=>').map((part) => part.trim());
      return {
        stepNumber: index + 1,
        action: action ?? '',
        expectedResult: expectedResult ?? '',
      };
    });
  }

  function getNextTestCaseId(existingCases: TestCase[]): string {
    const maxId = existingCases.reduce((max, tc) => {
      const match = /^TC-(\d+)$/i.exec(tc.id.trim());
      if (!match) {
        return max;
      }
      return Math.max(max, Number(match[1]));
    }, 0);
    return `TC-${String(maxId + 1).padStart(3, '0')}`;
  }

  function toggleCaseDetails(id: string) {
    setDetailOpenById((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function onAddManualFromText() {
    setMessage('');
    setImportBusy(true);
    try {
      const id = manualId.trim() || getNextTestCaseId(cases);
      const title = manualTitle.trim();
      const description = manualDescription.trim();
      const expectedOutcome = manualExpectedOutcome.trim();
      const preconditions = parseLines(manualPreconditions);
      const steps = parseStepsFromText(manualSteps).filter((step) => step.action.trim().length > 0);
      const tags = parseLines(manualTags).map((tag) => tag.replace(/^#/, ''));

      if (!title || !description || !expectedOutcome) {
        throw new Error('Title, description, and expected outcome are required.');
      }
      if (steps.length === 0) {
        throw new Error('Add at least one step. Use one line per step, optionally as: action => expected result');
      }

      const manualCase: TestCase = {
        id,
        title,
        type: manualType,
        priority: manualPriority,
        description,
        preconditions,
        steps,
        expectedOutcome,
        tags,
        source: 'manual',
        reviewStatus: 'pending',
      };

      if (manualType === 'API') {
        const endpoint = manualApiEndpoint.trim();
        const expectedStatus = Number(manualApiExpectedStatus);
        if (!endpoint) {
          throw new Error('API endpoint is required for API test cases.');
        }
        if (!Number.isInteger(expectedStatus) || expectedStatus < 100 || expectedStatus > 599) {
          throw new Error('API expected status must be a valid HTTP code (100-599).');
        }
        manualCase.apiDetails = {
          method: manualApiMethod.trim().toUpperCase(),
          endpoint,
          expectedStatus,
        };
      }

      const snapshot = await api.importTestCases([manualCase], 'merge');
      setCases(snapshot.testCases);
      setMessage(`Added manual test case ${id}.`);
      setManualId('');
      setManualTitle('');
      setManualDescription('');
      setManualPreconditions('');
      setManualSteps('');
      setManualExpectedOutcome('');
      setManualTags('');
      setManualApiEndpoint('');
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Manual input failed: ${text}`);
    } finally {
      setImportBusy(false);
    }
  }

  if (loading) {
    return <div className="fade-up">Loading test cases...</div>;
  }

  return (
    <div className="fade-up" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Test Cases</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void loadCases()} disabled={loading}>
            Refresh
          </button>
          <button onClick={onGenerate} disabled={loading}>
            Generate
          </button>
        </div>
      </div>
      {message && <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>{message}</div>}

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 12 }}>
          Manual test case input (normal text)
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Fill this form using plain text. The app converts it to the same JSON shape and imports via the same API
          validation.
        </div>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Test ID (optional)</span>
            <input value={manualId} onChange={(event) => setManualId(event.target.value)} placeholder="TC-010" />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type</span>
            <select value={manualType} onChange={(event) => setManualType(event.target.value as 'UI' | 'API')}>
              <option value="UI">UI</option>
              <option value="API">API</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Priority</span>
            <select
              value={manualPriority}
              onChange={(event) => setManualPriority(event.target.value as 'High' | 'Medium' | 'Low')}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
        </div>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Title</span>
          <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Description</span>
          <textarea value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} rows={2} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Preconditions (one per line, optional)
          </span>
          <textarea
            value={manualPreconditions}
            onChange={(event) => setManualPreconditions(event.target.value)}
            rows={2}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Steps (one per line, optionally: action =&gt; expected result)
          </span>
          <textarea value={manualSteps} onChange={(event) => setManualSteps(event.target.value)} rows={4} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expected outcome</span>
          <textarea
            value={manualExpectedOutcome}
            onChange={(event) => setManualExpectedOutcome(event.target.value)}
            rows={2}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tags (one per line, optional)</span>
          <textarea value={manualTags} onChange={(event) => setManualTags(event.target.value)} rows={2} />
        </label>
        {manualType === 'API' && (
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>API method</span>
              <input value={manualApiMethod} onChange={(event) => setManualApiMethod(event.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>API endpoint</span>
              <input value={manualApiEndpoint} onChange={(event) => setManualApiEndpoint(event.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expected status</span>
              <input
                value={manualApiExpectedStatus}
                onChange={(event) => setManualApiExpectedStatus(event.target.value)}
                placeholder="200"
              />
            </label>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onAddManualFromText} disabled={loading || importBusy}>
            Add from text
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 12 }}>
          Manual test case input (JSON)
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Paste the same JSON array format as after Generate: <code>data/output/test-cases.json</code> (array of
          objects with id, title, type, priority, description, preconditions, steps, expectedOutcome, tags, source,
          reviewStatus, and apiDetails for API tests).
        </div>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Import mode</span>
          <select
            value={importMode}
            onChange={(event) => setImportMode(event.target.value as 'merge' | 'replace')}
          >
            <option value="merge">Merge by id (upsert)</option>
            <option value="replace">Replace entire list</option>
          </select>
        </label>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder='[ { "id": "TC-001", "title": "...", "type": "UI", ... } ]'
          rows={12}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={onLoadTemplateFromCurrent} disabled={loading || importBusy}>
            Load current as template
          </button>
          <button type="button" onClick={onImportManual} disabled={loading || importBusy || !importText.trim()}>
            Import JSON
          </button>
        </div>
      </div>

      {cases.length === 0 && (
        <div style={{ color: 'var(--text-muted)' }}>
          No test cases yet. Generate or import a JSON array above.
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {cases.map((tc, index) => {
          const rowKey =
            typeof tc.id === 'string' && tc.id.trim().length > 0 ? tc.id.trim() : `row-${index}`;
          const detailsOpen = Boolean(detailOpenById[rowKey]);
          return (
            <div
              key={rowKey}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-surface)' }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                {rowKey} · {tc.type} · {tc.priority} · {tc.source} · {tc.reviewStatus} ·{' '}
                {tc.automationStatus ?? 'automatable'}
              </div>
              <div style={{ marginTop: 4, fontWeight: 600 }}>
                {typeof tc.title === 'string' && tc.title.trim() ? tc.title : 'Untitled test'}
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                {typeof tc.description === 'string' && tc.description.trim()
                  ? tc.description
                  : 'No short summary on file.'}
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => toggleCaseDetails(rowKey)}
                  aria-expanded={detailsOpen}
                  disabled={loading || importBusy}
                >
                  {detailsOpen ? 'Hide full test plan' : 'Open full test plan (plain language)'}
                </button>
              </div>
              {detailsOpen && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <TestCasePlainDetails tc={tc} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
