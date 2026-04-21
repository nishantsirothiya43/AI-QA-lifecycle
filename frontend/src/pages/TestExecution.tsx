import { type ChangeEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ExecutionReport } from '../types';

export default function TestExecution() {
  const [loading, setLoading] = useState(true);
  const [importBusy, setImportBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const [importText, setImportText] = useState('');

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

  async function onLoadCurrentReportTemplate() {
    try {
      const snapshot = await api.getSnapshot();
      if (!snapshot.executionReport) {
        setMessage('No execution report in workspace yet to use as template.');
        return;
      }
      setImportText(JSON.stringify(snapshot.executionReport, null, 2));
      setMessage('Loaded current execution report as JSON template.');
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Could not load template: ${text}`);
    }
  }

  async function onImportExecutionReport() {
    setMessage('');
    setImportBusy(true);
    try {
      const parsed = JSON.parse(importText) as unknown;
      const snapshot = await api.importExecutionReport(parsed);
      setReport(snapshot.executionReport);
      setMessage('Execution report imported from JSON.');
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Import failed: ${text}`);
    } finally {
      setImportBusy(false);
    }
  }

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('');
    setImportBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const snapshot = await api.importExecutionReport(parsed);
      setReport(snapshot.executionReport);
      setImportText(JSON.stringify(snapshot.executionReport, null, 2));
      setMessage(`Imported execution report from ${file.name}.`);
    } catch (error: unknown) {
      const errText = error instanceof Error ? error.message : String(error);
      setMessage(`File import failed: ${errText}`);
    } finally {
      setImportBusy(false);
      event.currentTarget.value = '';
    }
  }

  if (loading) {
    return <div className="fade-up">Loading execution module...</div>;
  }

  return (
    <div className="fade-up" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Test Execution</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void loadReport()} disabled={loading || importBusy}>
            Refresh
          </button>
          <button onClick={onRunTests} disabled={loading || importBusy}>
            Run Generated Playwright Tests
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
          External execution report (JSON)
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Paste or upload the same shape as <code>data/output/execution-report.json</code> (runAt, totalTests, passed,
          failed, skipped, results[]).
        </div>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={8}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={onLoadCurrentReportTemplate} disabled={loading || importBusy}>
            Load current as template
          </button>
          <button type="button" onClick={onImportExecutionReport} disabled={loading || importBusy || !importText.trim()}>
            Import from JSON text
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                border: '1px solid var(--border-bright)',
                borderRadius: 6,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              Upload JSON file
            </span>
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={onImportFile} />
          </label>
        </div>
      </div>

      {message && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{message}</div>}

      {!report && (
        <div style={{ color: 'var(--text-muted)' }}>
          No execution report yet. Run tests or import JSON above.
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
