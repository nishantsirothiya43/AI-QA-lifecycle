import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ScriptFile, TestCase } from '../types';

type AutomationEligibility = {
  totalGenerated: number;
  eligible: number;
  skippedNotAutomatable: number;
  skippedNotApproved: number;
};

function computeEligibility(testCases: TestCase[]): AutomationEligibility {
  const generated = testCases.filter((tc) => tc.source === 'generated');
  const eligible = generated.filter(
    (tc) => tc.reviewStatus === 'approved' && tc.automationStatus !== 'not_automatable'
  ).length;
  const skippedNotAutomatable = generated.filter((tc) => tc.automationStatus === 'not_automatable').length;
  const skippedNotApproved = generated.filter((tc) => tc.reviewStatus !== 'approved').length;

  return {
    totalGenerated: generated.length,
    eligible,
    skippedNotAutomatable,
    skippedNotApproved,
  };
}

export default function Scripts() {
  const [scripts, setScripts] = useState<ScriptFile[]>([]);
  const [eligibility, setEligibility] = useState<AutomationEligibility>({
    totalGenerated: 0,
    eligible: 0,
    skippedNotAutomatable: 0,
    skippedNotApproved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [scriptOpenById, setScriptOpenById] = useState<Record<string, boolean>>({});

  async function loadScripts() {
    setLoading(true);
    await api
      .getSnapshot()
      .then((snapshot) => {
        setScripts(snapshot.scripts);
        setEligibility(computeEligibility(snapshot.testCases));
      })
      .catch(() => {
        setScripts([]);
        setEligibility({
          totalGenerated: 0,
          eligible: 0,
          skippedNotAutomatable: 0,
          skippedNotApproved: 0,
        });
      })
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
        setEligibility(computeEligibility(snapshot.testCases));
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

  function toggleScriptBody(testId: string) {
    setScriptOpenById((prev) => ({ ...prev, [testId]: !prev[testId] }));
  }

  async function onApproval(testId: string, approved: boolean) {
    setMessage('');
    setLoading(true);
    try {
      const snapshot = await api.setScriptApproval(testId, approved);
      setScripts(snapshot.scripts);
      setEligibility(computeEligibility(snapshot.testCases));
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
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 12,
          marginBottom: 10,
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 10,
          background: 'var(--bg-surface)',
        }}
      >
        Eligible for automation: <strong>{eligibility.eligible}</strong> / {eligibility.totalGenerated} generated
        cases · Skipped non-automatable: {eligibility.skippedNotAutomatable} · Pending/not-approved:{' '}
        {eligibility.skippedNotApproved}
      </div>
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
        {scripts.map((s, index) => {
          const testId =
            typeof s.testId === 'string' && s.testId.trim().length > 0 ? s.testId.trim() : `script-row-${index}`;
          const rawContent = typeof s.scriptContent === 'string' ? s.scriptContent : '';
          const scriptOpen = Boolean(scriptOpenById[testId]);
          const preview =
            rawContent.length > 240 ? `${rawContent.slice(0, 240).trimEnd()}…` : rawContent;

          return (
            <div
              key={testId}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-surface)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{testId}</div>
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
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => void onApproval(s.testId, true)} disabled={loading}>
                  Approve script
                </button>
                <button type="button" onClick={() => void onApproval(s.testId, false)} disabled={loading}>
                  Revoke approval
                </button>
                <button
                  type="button"
                  onClick={() => toggleScriptBody(testId)}
                  aria-expanded={scriptOpen}
                  disabled={loading}
                >
                  {scriptOpen ? 'Hide generated script' : 'View generated script'}
                </button>
              </div>
              {!scriptOpen && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {rawContent.length > 0 ? (
                    <>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{preview}</span>
                      {rawContent.length > 240 ? (
                        <span> Use &quot;View generated script&quot; for the full file.</span>
                      ) : null}
                    </>
                  ) : (
                    'No script content was returned for this card.'
                  )}
                </div>
              )}
              {scriptOpen && (
                <pre
                  style={{
                    marginTop: 10,
                    maxHeight: 'min(70vh, 720px)',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    lineHeight: 1.4,
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-raised)',
                  }}
                >
                  {rawContent.length > 0 ? rawContent : 'No script content was returned for this card.'}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
