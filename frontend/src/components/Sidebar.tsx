import { NavLink } from 'react-router-dom';
import type { PipelineStatus } from '../types';

interface SidebarProps {
  status: PipelineStatus | null;
}

export default function Sidebar({ status }: SidebarProps) {
  return (
    <aside
      style={{
        width: 220,
        borderRight: '1px solid var(--border)',
        background: 'linear-gradient(180deg, #131a2d 0%, var(--bg-surface) 28%)',
        padding: 16,
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', marginBottom: 18, letterSpacing: 0.4, fontWeight: 700 }}>
        QA·AI
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['/dashboard', 'Dashboard'],
          ['/test-cases', 'Test Cases'],
          ['/scripts', 'Scripts'],
          ['/execution', 'Execution'],
          ['/review', 'Review'],
          ['/failures', 'Failures'],
        ].map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              color: isActive ? 'var(--accent-amber)' : 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: 13,
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${isActive ? 'var(--border-bright)' : 'transparent'}`,
              background: isActive ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {status && (
        <div
          style={{
            marginTop: 24,
            color: 'var(--text-muted)',
            fontSize: 12,
            borderTop: '1px solid var(--border)',
            paddingTop: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {status.provider} · {status.model}
        </div>
      )}
    </aside>
  );
}
