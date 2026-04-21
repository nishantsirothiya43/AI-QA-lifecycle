import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { FrontendInputState, PipelineStatus } from '../types';
import MetricCard from '../components/MetricCard';

interface DashboardProps {
  status: PipelineStatus | null;
}

export default function Dashboard({ status }: DashboardProps) {
  const [localStatus, setLocalStatus] = useState<PipelineStatus | null>(status);
  const [frontendInput, setFrontendInput] = useState<FrontendInputState>({
    targetUrl: 'https://demo.playwright.dev/todomvc/',
    acceptanceCriteria: '',
    updatedAt: null,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    api.getStatus().then(setLocalStatus).catch(() => setLocalStatus(null));
    api.getFrontendInput().then(setFrontendInput).catch(() => undefined);
  }, [status]);

  async function onSaveFrontendInput() {
    setBusy(true);
    setMessage('');
    try {
      const snapshot = await api.saveFrontendInput(frontendInput);
      setLocalStatus(snapshot.status);
      setFrontendInput(snapshot.frontendInput);
      setMessage('Frontend input context saved.');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessage(`Save failed: ${errMsg}`);
    } finally {
      setBusy(false);
    }
  }

  async function onRun(action: 'generate' | 'pipeline') {
    setBusy(true);
    setMessage('');
    try {
      const snapshot =
        action === 'generate' ? await api.generateTestCases() : await api.runFullPipeline();
      setLocalStatus(snapshot.status);
      setMessage(
        action === 'generate'
          ? `Generated ${snapshot.status.totalGenerated} test cases.`
          : `Pipeline run complete. Scripts: ${snapshot.status.totalScripts}.`
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessage(`Run failed: ${errMsg}`);
    } finally {
      setBusy(false);
    }
  }

  if (!localStatus) {
    return <div className="fade-up">Loading dashboard...</div>;
  }

  return (
    <div className="fade-up" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard label="Generated" value={localStatus.totalGenerated} sub="Test cases loaded in UI" />
        <MetricCard label="Approved" value={localStatus.totalApproved} sub="Ready for script generation" />
        <MetricCard label="Scripts" value={localStatus.totalScripts} sub="Generated script files in UI store" />
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
          Test Input Context (frontend)
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target URL</span>
          <input
            type="url"
            value={frontendInput.targetUrl}
            placeholder="https://app-under-test.example"
            onChange={(event) =>
              setFrontendInput((current) => ({ ...current, targetUrl: event.target.value }))
            }
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Acceptance Criteria</span>
          <textarea
            value={frontendInput.acceptanceCriteria}
            placeholder="Paste your AC here and save..."
            rows={10}
            onChange={(event) =>
              setFrontendInput((current) => ({ ...current, acceptanceCriteria: event.target.value }))
            }
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Last updated: {frontendInput.updatedAt ? new Date(frontendInput.updatedAt).toLocaleString() : 'Never'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onSaveFrontendInput} disabled={busy}>
              Save Context
            </button>
            <button onClick={() => onRun('generate')} disabled={busy}>
              Generate Test Cases
            </button>
            <button onClick={() => onRun('pipeline')} disabled={busy}>
              Run Full Pipeline
            </button>
          </div>
        </div>
      </div>
      {message && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{message}</div>}
    </div>
  );
}
