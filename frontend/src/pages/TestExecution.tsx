import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ExecutionReport } from '../types';

export default function TestExecution() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [report, setReport] = useState<ExecutionReport | null>(null);

  async function loadReport() {
    setLoading(true);
    await api
      .getSnapshot()
      .then((snapshot) => setReport(snapshot.executionReport))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadReport();
  }, []);

  async function onRunTests() {
    setLoading(true);
    setMessage('');
    await api
      .runTests()
      .then((snapshot) => {
        const next = snapshot.executionReport;
        setReport(next);
        setMessage(
          next
            ? `Execution complete. Passed: ${next.passed}, Failed: ${next.failed}, Skipped: ${next.skipped}.`
            : 'Execution complete.'
        );
      })
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        setMessage(`Execution failed: ${text}`);
      })
      .finally(() => setLoading(false));
  }

  if (loading) {
    return <div className="fade-up">Loading execution module...</div>;
  }

  return (
    <div className="fade-up" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Test Execution</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void loadReport()} disabled={loading}>
            Refresh
          </button>
          <button onClick={onRunTests} disabled={loading}>
            Run Generated Playwright Tests
          </button>
        </div>
      </div>

      {message && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{message}</div>}

      {!report && (
        <div style={{ color: 'var(--text-muted)' }}>
          No execution report yet. Run generated tests to create `data/output/execution-report.json`.
        </div>
      )}

      {report && (
        <>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Last run: {new Date(report.runAt).toLocaleString()} | Total: {report.totalTests} | Passed:{' '}
            {report.passed} | Failed: {report.failed} | Skipped: {report.skipped}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {report.results.map((result) => (
              <div
                key={`${result.testId}-${result.testTitle}`}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'var(--bg-surface)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                  {result.testId} · {result.status.toUpperCase()}
                </div>
                <div style={{ marginTop: 4 }}>{result.testTitle}</div>
                <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                  Duration: {result.duration} ms
                </div>
                {result.error && <div style={{ marginTop: 8, color: 'var(--accent-red)' }}>{result.error}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
