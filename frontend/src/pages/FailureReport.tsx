import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ExecutionReport, FailureCategory } from '../types';

export default function FailureReport() {
  const [failures, setFailures] = useState<FailureCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [executionReport, setExecutionReport] = useState<ExecutionReport | null>(null);
  const [message, setMessage] = useState('');

  async function loadFailures() {
    setLoading(true);
    await api
      .getSnapshot()
      .then((snapshot) => {
        setFailures(snapshot.failures);
        setExecutionReport(snapshot.executionReport);
      })
      .catch(() => {
        setFailures([]);
        setExecutionReport(null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadFailures();
  }, []);

  async function onRunTests() {
    setMessage('');
    setLoading(true);
    await api
      .runTests()
      .then((snapshot) => {
        setFailures(snapshot.failures);
        setExecutionReport(snapshot.executionReport);
        const report = snapshot.executionReport;
        setMessage(
          report
            ? `Tests completed. Passed: ${report.passed}, Failed: ${report.failed}, Skipped: ${report.skipped}.`
            : 'Tests completed.'
        );
      })
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        setMessage(`Test execution failed: ${text}`);
      })
      .finally(() => setLoading(false));
  }

  async function onAnalyzeFailures() {
    setMessage('');
    setLoading(true);
    await api
      .categorizeFailures()
      .then((snapshot) => {
        setFailures(snapshot.failures);
        setExecutionReport(snapshot.executionReport);
        setMessage(`Analyzed ${snapshot.failures.length} failures.`);
      })
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        setMessage(`Failure analysis failed: ${text}`);
      })
      .finally(() => setLoading(false));
  }

  if (loading) {
    return <div className="fade-up">Loading failure analysis...</div>;
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Failure Analysis</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void loadFailures()} disabled={loading}>
            Refresh
          </button>
          <button onClick={onRunTests} disabled={loading}>
            Run Tests
          </button>
          <button onClick={onAnalyzeFailures} disabled={loading}>
            Analyze Failures
          </button>
        </div>
      </div>
      {executionReport && (
        <div style={{ marginBottom: 10, color: 'var(--text-muted)' }}>
          Last run: {new Date(executionReport.runAt).toLocaleString()} | Total: {executionReport.totalTests} |
          Passed: {executionReport.passed} | Failed: {executionReport.failed}
        </div>
      )}
      {message && <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>{message}</div>}
      {failures.length === 0 && (
        <div style={{ color: 'var(--text-muted)' }}>
          No failure analysis found in local UI storage yet.
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {failures.map((f) => (
          <div
            key={f.testId}
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-surface)' }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-red)' }}>{f.testId}</div>
            <div style={{ marginTop: 4 }}>{f.testTitle}</div>
            <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
              {f.category} · {f.confidence}
            </div>
            <div style={{ marginTop: 6 }}>{f.reasoning}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
