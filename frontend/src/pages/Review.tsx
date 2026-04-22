import { useEffect, useState } from 'react';
import { TestCasePlainDetails } from '../components/TestCasePlainDetails';
import { api } from '../api/client';
import type { TestCase } from '../types';

export default function Review() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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

  function toggleCaseDetails(id: string) {
    setDetailOpenById((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function setStatus(id: string, reviewStatus: TestCase['reviewStatus']) {
    setBusy(true);
    setMessage('');
    try {
      await api.updateTestCase(id, { reviewStatus });
      setCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, reviewStatus } : tc)));
      setMessage(`${id} marked as ${reviewStatus}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Failed to update review status: ${text}`);
    } finally {
      setBusy(false);
    }
  }

  async function setAutomatable(id: string, automationStatus: 'automatable' | 'not_automatable') {
    setBusy(true);
    setMessage('');
    try {
      await api.updateTestCase(id, { automationStatus });
      setCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, automationStatus } : tc)));
      setMessage(`${id} marked as ${automationStatus}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Failed to update automatable status: ${text}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="fade-up">Loading review queue...</div>;
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Review Test Cases</h2>
        <button onClick={() => void loadCases()} disabled={loading || busy}>
          Refresh
        </button>
      </div>
      {message && <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>{message}</div>}
      {cases.length === 0 && (
        <div style={{ color: 'var(--text-muted)' }}>
          No cases to review. Import test-case JSON from Dashboard.
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
              <div style={{ fontFamily: 'var(--font-mono)' }}>
                {rowKey} · <span style={{ color: 'var(--accent-amber)' }}>{tc.reviewStatus}</span>
                {' · '}
                <span style={{ color: tc.automationStatus === 'not_automatable' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {tc.automationStatus ?? 'automatable'}
                </span>
              </div>
              <div style={{ marginTop: 6 }}>
                {typeof tc.title === 'string' && tc.title.trim() ? tc.title : 'Untitled test'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => toggleCaseDetails(rowKey)} aria-expanded={detailsOpen}>
                  {detailsOpen ? 'Hide full test plan' : 'Open full test plan (plain language)'}
                </button>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => void setStatus(tc.id, 'approved')} disabled={busy}>
                  Approve
                </button>
                <button type="button" onClick={() => void setStatus(tc.id, 'rejected')} disabled={busy}>
                  Reject
                </button>
                <button type="button" onClick={() => void setStatus(tc.id, 'edited')} disabled={busy}>
                  Mark Edited
                </button>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => void setAutomatable(tc.id, 'automatable')} disabled={busy}>
                  Mark Automatable
                </button>
                <button type="button" onClick={() => void setAutomatable(tc.id, 'not_automatable')} disabled={busy}>
                  Mark Not Automatable
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
