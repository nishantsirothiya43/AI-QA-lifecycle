import type { AIProvider } from '../types';

interface ProviderBadgeProps {
  provider: AIProvider;
  model: string;
}

export default function ProviderBadge({ provider, model }: ProviderBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid var(--border-bright)',
        borderRadius: 6,
        padding: '4px 10px',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <span style={{ color: 'var(--accent-amber)' }}>{provider}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{model}</span>
    </div>
  );
}
