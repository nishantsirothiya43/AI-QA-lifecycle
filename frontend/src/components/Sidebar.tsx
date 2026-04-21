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
        background: 'var(--bg-surface)',
        padding: 16,
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', marginBottom: 18 }}>QA·AI</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['/dashboard', 'Dashboard'],
          ['/test-cases', 'Test Cases'],
          ['/scripts', 'Scripts'],
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
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {status && (
        <div style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 12 }}>
          {status.provider} · {status.model}
        </div>
      )}
    </aside>
  );
}
