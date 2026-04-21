import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ScriptFile } from '../types';

export default function Scripts() {
  const [scripts, setScripts] = useState<ScriptFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadScripts() {
    setLoading(true);
    await api
      .getScripts()
      .then(setScripts)
      .catch(() => setScripts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadScripts();
  }, []);

  async function onGenerateScripts() {
    setMessage('');
    setLoading(true);
    api
      .generateScripts()
      .then((snapshot) => {
        setScripts(snapshot.scripts);
        setMessage(
          `Generated ${snapshot.scripts.length} scripts. Approve each script before running Playwright tests.`
        );
      })
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        setMessage(`Script generation failed: ${text}`);
      })
      .finally(() => setLoading(false));
  }

  async function onApproval(testId: string, approved: boolean) {
    setMessage('');
    setLoading(true);
    try {
      const snapshot = await api.setScriptApproval(testId, approved);
      setScripts(snapshot.scripts);
      setMessage(`${testId} marked ${approved ? 'approved' : 'not approved'}.`);
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Approval update failed: ${text}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="fade-up">Loading scripts...</div>;
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Generated Scripts</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void loadScripts()} disabled={loading}>
            Refresh
          </button>
          <button onClick={onGenerateScripts} disabled={loading}>
            Generate Scripts
          </button>
        </div>
      </div>
      {message && <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>{message}</div>}
      {scripts.length > 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>
          Execution is blocked until every script below is approved (after manifest is created by Generate Scripts).
        </div>
      )}
      {scripts.length === 0 && (
        <div style={{ color: 'var(--text-muted)' }}>
          No scripts yet. Approve test cases, then generate scripts.
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {scripts.map((s) => (
          <div
            key={s.testId}
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-surface)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{s.testId}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Script status:{' '}
                {s.approved === true ? (
                  <span style={{ color: 'var(--accent-amber)' }}>approved</span>
                ) : s.approved === false ? (
                  <span>pending approval</span>
                ) : (
                  <span>no gate (no manifest)</span>
                )}
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => void onApproval(s.testId, true)} disabled={loading}>
                Approve script
              </button>
              <button type="button" onClick={() => void onApproval(s.testId, false)} disabled={loading}>
                Revoke approval
              </button>
            </div>
            <pre
              style={{
                marginTop: 8,
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              {s.scriptContent.slice(0, 300)}...
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
