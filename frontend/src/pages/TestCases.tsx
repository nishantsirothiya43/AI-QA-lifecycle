import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { TestCase } from '../types';

export default function TestCases() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return <div className="fade-up">Loading test cases...</div>;
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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
      {cases.length === 0 && (
        <div style={{ color: 'var(--text-muted)' }}>
          No test cases in local UI storage yet. Import a JSON file from Dashboard.
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {cases.map((tc) => (
          <div
            key={tc.id}
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-surface)' }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
              {tc.id} · {tc.type} · {tc.priority}
            </div>
            <div style={{ marginTop: 4, fontWeight: 600 }}>{tc.title}</div>
            <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{tc.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
