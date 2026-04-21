import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { TestCase } from '../types';

export default function Review() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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
        {cases.map((tc) => (
          <div
            key={tc.id}
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-surface)' }}
          >
            <div style={{ fontFamily: 'var(--font-mono)' }}>
              {tc.id} · <span style={{ color: 'var(--accent-amber)' }}>{tc.reviewStatus}</span>
            </div>
            <div style={{ marginTop: 6 }}>{tc.title}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={() => void setStatus(tc.id, 'approved')} disabled={busy}>
                Approve
              </button>
              <button onClick={() => void setStatus(tc.id, 'rejected')} disabled={busy}>
                Reject
              </button>
              <button onClick={() => void setStatus(tc.id, 'edited')} disabled={busy}>
                Mark Edited
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
