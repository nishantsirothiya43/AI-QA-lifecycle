import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon?: ReactNode;
}

export default function MetricCard({ label, value, sub, icon }: MetricCardProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #182038 0%, var(--bg-surface) 42%)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 16,
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 0.3 }}>
          {label}
        </div>
        <div>{icon}</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 28, fontFamily: 'var(--font-mono)' }}>{value}</div>
      {sub && <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>{sub}</div>}
    </div>
  );
}
