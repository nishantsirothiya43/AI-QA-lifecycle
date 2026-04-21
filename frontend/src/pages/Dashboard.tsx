import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { FrontendInputState, PipelineStatus, ProviderConfig } from '../types';
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
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({
    aiProvider: 'gemini',
    mockLlm: false,
    playwrightExecutionMode: 'local',
    dockerPlaywrightImage: 'mcr.microsoft.com/playwright:v1.59.1-noble',
    geminiModel: 'gemini-2.5-flash',
    geminiApiKey: '',
    hasGeminiApiKey: false,
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    claudeModel: 'claude-sonnet-4-20250514',
    claudeApiKey: '',
    hasClaudeApiKey: false,
  });

  useEffect(() => {
    api.getStatus().then(setLocalStatus).catch(() => setLocalStatus(null));
    api.getFrontendInput().then(setFrontendInput).catch(() => undefined);
    api.getProviderConfig().then(setProviderConfig).catch(() => undefined);
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
      if (action === 'pipeline' && snapshot.pipelineWarnings?.length) {
        setMessage(
          `${snapshot.pipelineWarnings.join(' ')}\n` +
            'Approve all scripts on the Scripts page, then run tests from Execution.'
        );
      } else {
        setMessage(
          action === 'generate'
            ? `Generated ${snapshot.status.totalGenerated} test cases.`
            : `Pipeline run complete. Scripts: ${snapshot.status.totalScripts}.`
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessage(`Run failed: ${errMsg}`);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProviderConfig() {
    setBusy(true);
    setMessage('');
    try {
      const saved = await api.saveProviderConfig(providerConfig);
      setProviderConfig(saved);
      const snapshot = await api.getSnapshot();
      setLocalStatus(snapshot.status);
      setMessage('Provider settings saved and reloaded from .env.');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessage(`Provider settings save failed: ${errMsg}`);
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
          Provider Settings (.env live config)
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI Provider</span>
          <select
            value={providerConfig.aiProvider}
            onChange={(event) =>
              setProviderConfig((current) => ({
                ...current,
                aiProvider: event.target.value as ProviderConfig['aiProvider'],
              }))
            }
          >
            <option value="gemini">gemini</option>
            <option value="ollama">ollama</option>
            <option value="claude">claude</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gemini API Key (leave blank to keep)</span>
          <input
            type="password"
            value={providerConfig.geminiApiKey ?? ''}
            placeholder={providerConfig.hasGeminiApiKey ? 'Configured' : 'Paste Gemini key'}
            onChange={(event) =>
              setProviderConfig((current) => ({ ...current, geminiApiKey: event.target.value }))
            }
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gemini Model</span>
          <input
            value={providerConfig.geminiModel}
            onChange={(event) =>
              setProviderConfig((current) => ({ ...current, geminiModel: event.target.value }))
            }
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ollama Base URL</span>
          <input
            value={providerConfig.ollamaBaseUrl}
            onChange={(event) =>
              setProviderConfig((current) => ({ ...current, ollamaBaseUrl: event.target.value }))
            }
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ollama Model</span>
          <input
            value={providerConfig.ollamaModel}
            onChange={(event) =>
              setProviderConfig((current) => ({ ...current, ollamaModel: event.target.value }))
            }
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Claude API Key (leave blank to keep)</span>
          <input
            type="password"
            value={providerConfig.claudeApiKey ?? ''}
            placeholder={providerConfig.hasClaudeApiKey ? 'Configured' : 'Paste Claude key'}
            onChange={(event) =>
              setProviderConfig((current) => ({ ...current, claudeApiKey: event.target.value }))
            }
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Claude Model</span>
          <input
            value={providerConfig.claudeModel}
            onChange={(event) =>
              setProviderConfig((current) => ({ ...current, claudeModel: event.target.value }))
            }
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={providerConfig.mockLlm}
            onChange={(event) =>
              setProviderConfig((current) => ({ ...current, mockLlm: event.target.checked }))
            }
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enable MOCK_LLM</span>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Playwright Execution Mode</span>
          <select
            value={providerConfig.playwrightExecutionMode}
            onChange={(event) =>
              setProviderConfig((current) => ({
                ...current,
                playwrightExecutionMode: event.target.value as ProviderConfig['playwrightExecutionMode'],
              }))
            }
          >
            <option value="local">local</option>
            <option value="docker">docker</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Docker Playwright Image</span>
          <input
            value={providerConfig.dockerPlaywrightImage}
            onChange={(event) =>
              setProviderConfig((current) => ({ ...current, dockerPlaywrightImage: event.target.value }))
            }
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onSaveProviderConfig} disabled={busy}>
            Save Provider Settings
          </button>
        </div>
      </div>
      {message && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{message}</div>}
    </div>
  );
}
