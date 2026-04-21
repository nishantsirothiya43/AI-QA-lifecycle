# BLUEPRINT SECTION 15 — React + Vite Frontend

> Paste this section into your existing `AI_QA_LIFECYCLE_BLUEPRINT.md` as **Section 15**.
> This is a standalone, self-contained frontend that communicates with the Node.js backend via a REST API bridge.

---

## 15. React + Vite Frontend

### Design Direction

**Aesthetic**: Industrial terminal — dark background, monospaced data, sharp amber/green accents, deliberate grid density. This is a QA tool used by engineers, so it should feel like a precision instrument, not a marketing page. Think: Bloomberg terminal crossed with a railway departures board.

**Fonts**:
- Display/headings: `JetBrains Mono` (communicates "code", matches Playwright scripts)
- Body/UI labels: `DM Sans` (readable, slightly clinical)

**Color palette**:
```
--bg-base:      #0d0f12   (near-black with blue tint)
--bg-surface:   #141720   (cards, panels)
--bg-raised:    #1c2030   (hover states, inputs)
--border:       #252a3a   (subtle dividers)
--text-primary: #e8eaf0   (high-contrast body)
--text-muted:   #6b7394   (labels, metadata)
--accent-amber: #f59e0b   (primary action, active states)
--accent-green: #22c55e   (passed / approved / success)
--accent-red:   #ef4444   (failed / rejected / error)
--accent-blue:  #3b82f6   (info, API badge)
--accent-purple:#a855f7   (UI badge)
```

---

### 15.1 Folder Structure

Add this alongside the existing `src/` Node.js backend:

```
ai-qa-lifecycle/
├── frontend/                         ← NEW: entire React app lives here
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   │
│   └── src/
│       ├── main.tsx                  # React entry point
│       ├── App.tsx                   # Router + layout shell
│       ├── index.css                 # Global CSS variables + resets
│       │
│       ├── components/               # Shared component library
│       │   ├── Sidebar.tsx
│       │   ├── StepBadge.tsx
│       │   ├── ProviderBadge.tsx
│       │   └── MetricCard.tsx
│       │
│       ├── pages/
│       │   ├── Dashboard.tsx         # Pipeline overview + metrics
│       │   ├── TestCases.tsx         # Browse / approve / reject test cases
│       │   ├── Scripts.tsx           # Browse generated Playwright scripts
│       │   ├── Review.tsx            # Human review interface
│       │   └── FailureReport.tsx     # Failure categorization output
│       │
│       ├── hooks/
│       │   ├── useTestCases.ts
│       │   ├── useScripts.ts
│       │   └── useFailures.ts
│       │
│       ├── api/
│       │   └── client.ts             # fetch wrapper for backend REST API
│       │
│       └── types/
│           └── index.ts              # Mirrors src/types.ts from backend
│
├── src/                              ← Existing Node.js backend
│   └── api-server.ts                 ← NEW: Express server to expose backend as REST
└── ...
```

---

### 15.2 Frontend `package.json`

**File:** `frontend/package.json`

```json
{
  "name": "ai-qa-lifecycle-ui",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.2",
    "vite": "^5.1.0"
  }
}
```

> Run `cd frontend && npm install` after creating this file.

---

### 15.3 Vite Config

**File:** `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api calls to the Node.js backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

---

### 15.4 Frontend `tsconfig.json`

**File:** `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

---

### 15.5 Global CSS

**File:** `frontend/src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-base:       #0d0f12;
  --bg-surface:    #141720;
  --bg-raised:     #1c2030;
  --border:        #252a3a;
  --border-bright: #353d58;
  --text-primary:  #e8eaf0;
  --text-muted:    #6b7394;
  --text-faint:    #3d4460;
  --accent-amber:  #f59e0b;
  --accent-amber2: #fbbf24;
  --accent-green:  #22c55e;
  --accent-red:    #ef4444;
  --accent-blue:   #3b82f6;
  --accent-purple: #a855f7;
  --accent-orange: #f97316;

  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'DM Sans', system-ui, sans-serif;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-glow-amber: 0 0 20px rgba(245,158,11,0.15);
}

html, body, #root {
  height: 100%;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--border-bright); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-faint); }

/* Utility classes */
.mono { font-family: var(--font-mono); }
.text-muted { color: var(--text-muted); }
.text-amber { color: var(--accent-amber); }
.text-green { color: var(--accent-green); }
.text-red   { color: var(--accent-red); }
.text-blue  { color: var(--accent-blue); }

/* Fade-in animation used by pages */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up {
  animation: fadeUp 0.3s ease forwards;
}
```

---

### 15.6 Frontend Types

**File:** `frontend/src/types/index.ts`

```typescript
// Mirror of backend src/types.ts — keep in sync manually
export type TestType     = 'UI' | 'API';
export type Priority     = 'High' | 'Medium' | 'Low';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';
export type AIProvider   = 'gemini' | 'ollama' | 'claude';

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface ApiTestDetails {
  method: string;
  endpoint: string;
  requestBody?: Record<string, unknown>;
  expectedStatus: number;
  expectedResponseFields?: string[];
}

export interface TestCase {
  id: string;
  title: string;
  type: TestType;
  priority: Priority;
  description: string;
  preconditions: string[];
  steps: TestStep[];
  expectedOutcome: string;
  tags: string[];
  apiDetails?: ApiTestDetails;
  source: 'generated' | 'manual';
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
}

export interface ScriptFile {
  testId: string;
  filePath: string;
  scriptContent: string;
  approved?: boolean;
}

export interface ExecutionResult {
  testId: string;
  testTitle: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  stackTrace?: string;
}

export type FailureCategoryType =
  | 'script_locator_issue'
  | 'product_defect'
  | 'environment_issue'
  | 'test_data_issue'
  | 'assertion_mismatch'
  | 'unknown';

export interface FailureCategory {
  testId: string;
  testTitle: string;
  category: FailureCategoryType;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  suggestedAction: string;
}

export interface PipelineStatus {
  provider: AIProvider;
  model: string;
  totalGenerated: number;
  totalApproved: number;
  totalScripts: number;
  lastRun: string | null;
}
```

---

### 15.7 API Client

**File:** `frontend/src/api/client.ts`

```typescript
const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Pipeline status
  getStatus: ()                          => request<PipelineStatus>('/status'),

  // Test cases
  getTestCases: ()                       => request<TestCase[]>('/test-cases'),
  updateTestCase: (id: string, patch: Partial<TestCase>) =>
    request<TestCase>(`/test-cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  generateTestCases: ()                  => request<TestCase[]>('/generate/test-cases', { method: 'POST' }),

  // Scripts
  getScripts: ()                         => request<ScriptFile[]>('/scripts'),
  generateScripts: ()                    => request<ScriptFile[]>('/generate/scripts', { method: 'POST' }),
  approveScript: (testId: string)        => request<ScriptFile>(`/scripts/${testId}/approve`, { method: 'POST' }),
  rejectScript: (testId: string)         => request<ScriptFile>(`/scripts/${testId}/reject`,  { method: 'POST' }),

  // Failures
  getFailures: ()                        => request<FailureCategory[]>('/failures'),
  categorizeFailures: ()                 => request<FailureCategory[]>('/analyze/failures', { method: 'POST' }),
};

// Re-export types for convenience
export type { TestCase, ScriptFile, FailureCategory, PipelineStatus } from '../types';
```

---

### 15.8 `index.html`

**File:** `frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QA Lifecycle · AI Dashboard</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧪</text></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### 15.9 `main.tsx`

**File:** `frontend/src/main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

---

### 15.10 `App.tsx` — Router + Layout Shell

**File:** `frontend/src/App.tsx`

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TestCases from './pages/TestCases';
import Scripts from './pages/Scripts';
import Review from './pages/Review';
import FailureReport from './pages/FailureReport';
import { api } from './api/client';
import type { PipelineStatus } from './types';

export default function App() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    api.getStatus()
      .then(setStatus)
      .catch(() => {
        // Backend not running — show offline state
        setStatus(null);
      });
  }, []);

  return (
    <div style={styles.shell}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(p => !p)}
        status={status}
      />

      <main style={{
        ...styles.main,
        marginLeft: sidebarCollapsed ? '64px' : '240px',
      }}>
        {/* Top bar */}
        <div style={styles.topbar}>
          <span style={styles.topbarTitle}>AI-Powered QA Lifecycle</span>
          {status && (
            <span style={styles.topbarMeta} className="mono">
              {status.provider} · {status.model}
            </span>
          )}
        </div>

        {/* Page content */}
        <div style={styles.content}>
          <Routes>
            <Route path="/"              element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"     element={<Dashboard status={status} />} />
            <Route path="/test-cases"    element={<TestCases />} />
            <Route path="/scripts"       element={<Scripts />} />
            <Route path="/review"        element={<Review />} />
            <Route path="/failures"      element={<FailureReport />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg-base)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    transition: 'margin-left 0.2s ease',
    overflow: 'hidden',
  },
  topbar: {
    height: '52px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  topbarTitle: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  topbarMeta: {
    fontSize: '11px',
    color: 'var(--accent-amber)',
    background: 'rgba(245,158,11,0.1)',
    padding: '3px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(245,158,11,0.2)',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '28px',
  },
};
```

---

### 15.11 Shared Component: `Sidebar.tsx`

**File:** `frontend/src/components/Sidebar.tsx`

```tsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Code2,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from 'lucide-react';
import ProviderBadge from './ProviderBadge';
import type { PipelineStatus } from '../types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  status: PipelineStatus | null;
}

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/test-cases', icon: ClipboardList,   label: 'Test Cases'   },
  { to: '/scripts',    icon: Code2,           label: 'Scripts'      },
  { to: '/review',     icon: Eye,             label: 'Review'       },
  { to: '/failures',   icon: AlertTriangle,   label: 'Failures'     },
];

export default function Sidebar({ collapsed, onToggle, status }: SidebarProps) {
  return (
    <aside style={{
      ...styles.sidebar,
      width: collapsed ? '64px' : '240px',
    }}>
      {/* Logo */}
      <div style={styles.logo}>
        <FlaskConical size={20} color="var(--accent-amber)" strokeWidth={1.5} />
        {!collapsed && (
          <span style={styles.logoText}>QA<span style={styles.logoAccent}>·AI</span></span>
        )}
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navItemActive : {}),
            })}
            title={collapsed ? label : undefined}
          >
            <Icon size={16} strokeWidth={1.5} style={styles.navIcon} />
            {!collapsed && <span style={styles.navLabel}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Provider info at bottom */}
      {!collapsed && status && (
        <div style={styles.providerSection}>
          <p style={styles.providerLabel}>AI Provider</p>
          <ProviderBadge provider={status.provider} model={status.model} />
        </div>
      )}

      {/* Collapse toggle */}
      <button style={styles.toggle} onClick={onToggle} title="Toggle sidebar">
        {collapsed
          ? <ChevronRight size={14} />
          : <ChevronLeft  size={14} />
        }
      </button>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    height: '100vh',
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  logo: {
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 20px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  logoText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
  },
  logoAccent: {
    color: 'var(--accent-amber)',
  },
  nav: {
    flex: 1,
    padding: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 20px',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '0',
    transition: 'all 0.15s ease',
    borderLeft: '2px solid transparent',
    whiteSpace: 'nowrap',
  },
  navItemActive: {
    color: 'var(--accent-amber)',
    background: 'rgba(245,158,11,0.06)',
    borderLeftColor: 'var(--accent-amber)',
  },
  navIcon: {
    flexShrink: 0,
  },
  navLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  providerSection: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border)',
  },
  providerLabel: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--text-faint)',
    marginBottom: '8px',
    fontFamily: 'var(--font-mono)',
  },
  toggle: {
    position: 'absolute',
    bottom: '16px',
    right: '12px',
    width: '24px',
    height: '24px',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border-bright)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
};
```

---

### 15.12 Shared Component: `StepBadge.tsx`

Displays which pipeline step a test case or item belongs to (1–7), with color coding by stage.

**File:** `frontend/src/components/StepBadge.tsx`

```tsx
interface StepBadgeProps {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label?: string;
  size?: 'sm' | 'md';
}

const STEP_META: Record<number, { color: string; bg: string; defaultLabel: string }> = {
  1: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', defaultLabel: 'Generate'  },
  2: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  defaultLabel: 'Manual'    },
  3: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  defaultLabel: 'Review'    },
  4: { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  defaultLabel: 'Script'    },
  5: { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   defaultLabel: 'Approve'   },
  6: { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  defaultLabel: 'Execute'   },
  7: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   defaultLabel: 'Analyze'   },
};

export default function StepBadge({ step, label, size = 'md' }: StepBadgeProps) {
  const meta = STEP_META[step];
  const isSmall = size === 'sm';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isSmall ? '4px' : '6px',
      background: meta.bg,
      border: `1px solid ${meta.color}33`,
      borderRadius: '4px',
      padding: isSmall ? '2px 6px' : '3px 9px',
      fontFamily: 'var(--font-mono)',
      fontSize: isSmall ? '10px' : '11px',
      fontWeight: 600,
      color: meta.color,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: isSmall ? '14px' : '16px',
        height: isSmall ? '14px' : '16px',
        background: meta.color,
        color: '#000',
        borderRadius: '3px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isSmall ? '9px' : '10px',
        fontWeight: 800,
        flexShrink: 0,
      }}>
        {step}
      </span>
      {label ?? meta.defaultLabel}
    </span>
  );
}
```

**Usage examples:**
```tsx
<StepBadge step={1} />                          // "1 Generate" in amber
<StepBadge step={3} label="Human Review" />     // custom label
<StepBadge step={7} size="sm" />                // small variant
```

---

### 15.13 Shared Component: `ProviderBadge.tsx`

Displays the active AI provider with its icon and model name.

**File:** `frontend/src/components/ProviderBadge.tsx`

```tsx
import type { AIProvider } from '../types';

interface ProviderBadgeProps {
  provider: AIProvider;
  model: string;
  size?: 'sm' | 'md' | 'lg';
  showModel?: boolean;
}

const PROVIDER_META: Record<AIProvider, {
  label: string;
  color: string;
  bg: string;
  icon: string;   // emoji or SVG letter
}> = {
  gemini: {
    label: 'Gemini',
    color: '#4285f4',
    bg: 'rgba(66,133,244,0.12)',
    icon: 'G',
  },
  ollama: {
    label: 'Ollama',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    icon: '⬡',
  },
  claude: {
    label: 'Claude',
    color: '#cc785c',
    bg: 'rgba(204,120,92,0.12)',
    icon: 'A',
  },
};

export default function ProviderBadge({
  provider,
  model,
  size = 'md',
  showModel = true,
}: ProviderBadgeProps) {
  const meta = PROVIDER_META[provider] ?? PROVIDER_META.gemini;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const fontSize = size === 'sm' ? 10 : size === 'lg' ? 13 : 11;
  const modelFontSize = size === 'sm' ? 9 : 10;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: meta.bg,
      border: `1px solid ${meta.color}33`,
      borderRadius: 'var(--radius-sm)',
      padding: size === 'sm' ? '3px 8px' : size === 'lg' ? '8px 14px' : '5px 10px',
    }}>
      {/* Provider icon circle */}
      <span style={{
        width: `${iconSize}px`,
        height: `${iconSize}px`,
        background: meta.color,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'var(--font-mono)',
        fontSize: `${Math.round(iconSize * 0.55)}px`,
        fontWeight: 800,
        flexShrink: 0,
        letterSpacing: 0,
      }}>
        {meta.icon}
      </span>

      {/* Label + model */}
      <span style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          color: meta.color,
          lineHeight: 1,
        }}>
          {meta.label}
        </span>
        {showModel && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: `${modelFontSize}px`,
            color: 'var(--text-muted)',
            lineHeight: 1,
          }}>
            {model}
          </span>
        )}
      </span>
    </div>
  );
}
```

**Usage examples:**
```tsx
<ProviderBadge provider="gemini" model="gemini-1.5-flash" />
<ProviderBadge provider="ollama" model="llama3" size="sm" showModel={false} />
<ProviderBadge provider="claude" model="claude-sonnet-4-20250514" size="lg" />
```

---

### 15.14 Shared Component: `MetricCard.tsx`

Displays a single KPI/metric — used in the Dashboard grid.

**File:** `frontend/src/components/MetricCard.tsx`

```tsx
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon?: ReactNode;
  accent?: 'amber' | 'green' | 'red' | 'blue' | 'purple' | 'default';
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

const ACCENT_COLORS = {
  amber:   { main: 'var(--accent-amber)',  glow: 'rgba(245,158,11,0.08)'  },
  green:   { main: 'var(--accent-green)',  glow: 'rgba(34,197,94,0.08)'   },
  red:     { main: 'var(--accent-red)',    glow: 'rgba(239,68,68,0.08)'   },
  blue:    { main: 'var(--accent-blue)',   glow: 'rgba(59,130,246,0.08)'  },
  purple:  { main: 'var(--accent-purple)', glow: 'rgba(168,85,247,0.08)'  },
  default: { main: 'var(--text-muted)',    glow: 'transparent'            },
};

const TREND_SYMBOL = {
  up: { symbol: '↑', color: 'var(--accent-green)' },
  down: { symbol: '↓', color: 'var(--accent-red)' },
  neutral: { symbol: '→', color: 'var(--text-muted)' },
};

export default function MetricCard({
  label,
  value,
  sub,
  icon,
  accent = 'default',
  trend,
  onClick,
}: MetricCardProps) {
  const colors = ACCENT_COLORS[accent];
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        boxShadow: 'var(--shadow-sm)',
        // Top accent bar
        borderTop: `2px solid ${colors.main}`,
      }}
      onMouseEnter={e => {
        if (!isClickable) return;
        (e.currentTarget as HTMLDivElement).style.borderColor = colors.main;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${colors.glow}`;
      }}
      onMouseLeave={e => {
        if (!isClickable) return;
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Background glow blob */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        background: colors.glow,
        borderRadius: '50%',
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}>
          {label}
        </span>
        {icon && (
          <span style={{ color: colors.main, opacity: 0.8 }}>
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{
          fontSize: '36px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: colors.main === 'var(--text-muted)' ? 'var(--text-primary)' : colors.main,
          lineHeight: 1,
          letterSpacing: '-0.03em',
        }}>
          {value}
        </span>
        {trend && (
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: TREND_SYMBOL[trend].color,
            fontFamily: 'var(--font-mono)',
          }}>
            {TREND_SYMBOL[trend].symbol}
          </span>
        )}
      </div>

      {/* Sub-label */}
      {sub && (
        <span style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.4,
        }}>
          {sub}
        </span>
      )}
    </div>
  );
}
```

**Usage examples:**
```tsx
import { ClipboardList, CheckCircle, XCircle, Code2 } from 'lucide-react';

<MetricCard
  label="Total Test Cases"
  value={24}
  sub="12 generated · 12 manual"
  icon={<ClipboardList size={16} />}
  accent="amber"
/>

<MetricCard
  label="Approved"
  value={18}
  sub="75% approval rate"
  icon={<CheckCircle size={16} />}
  accent="green"
  trend="up"
/>

<MetricCard
  label="Failed Tests"
  value={3}
  sub="2 product defects · 1 env issue"
  icon={<XCircle size={16} />}
  accent="red"
  trend="down"
  onClick={() => navigate('/failures')}
/>

<MetricCard
  label="Scripts Generated"
  value={18}
  icon={<Code2 size={16} />}
  accent="blue"
/>
```

---

### 15.15 Backend API Bridge

Add a lightweight Express server to expose the backend as a REST API.

**File:** `src/api-server.ts`

### Cursor Prompt:
> "Implement `src/api-server.ts` using Express. Mount routes for all api client calls defined in `frontend/src/api/client.ts`. Routes should read/write from the same JSON files used by the CLI modules. Add CORS headers for localhost:5173. Run on port 3001."

```typescript
import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { readJsonFile, writeJsonFile, fileExists } from './utils/fileHelpers';
import { CONFIG } from './config';
import { getProviderInfo } from './utils/ai';
import type { TestCase, ScriptFile, FailureCategory } from './types';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// GET /api/status
app.get('/api/status', async (_req, res) => {
  const { provider, model } = getProviderInfo();
  const hasCases = await fileExists(CONFIG.paths.generatedTestCases);
  const hasApproved = await fileExists(CONFIG.paths.approvedTestCases);

  let totalGenerated = 0, totalApproved = 0, totalScripts = 0;
  if (hasCases) {
    const cases = await readJsonFile<TestCase[]>(CONFIG.paths.generatedTestCases);
    totalGenerated = cases.length;
  }
  if (hasApproved) {
    const approved = await readJsonFile<TestCase[]>(CONFIG.paths.approvedTestCases);
    totalApproved = approved.length;
    totalScripts = approved.length; // approximation
  }

  res.json({ provider, model, totalGenerated, totalApproved, totalScripts, lastRun: null });
});

// GET /api/test-cases
app.get('/api/test-cases', async (_req, res) => {
  const file = await fileExists(CONFIG.paths.generatedTestCases)
    ? CONFIG.paths.generatedTestCases
    : null;
  res.json(file ? await readJsonFile<TestCase[]>(file) : []);
});

// PATCH /api/test-cases/:id
app.patch('/api/test-cases/:id', async (req, res) => {
  const cases = await readJsonFile<TestCase[]>(CONFIG.paths.generatedTestCases);
  const idx = cases.findIndex(tc => tc.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  cases[idx] = { ...cases[idx], ...req.body };
  await writeJsonFile(CONFIG.paths.generatedTestCases, cases);
  res.json(cases[idx]);
});

// GET /api/scripts
app.get('/api/scripts', async (_req, res) => {
  const scriptsDir = CONFIG.paths.scripts;
  // Read all .spec.ts files from the scripts directory
  const { readdir } = await import('fs/promises');
  try {
    const files = await readdir(scriptsDir);
    const scripts: ScriptFile[] = await Promise.all(
      files.filter(f => f.endsWith('.spec.ts')).map(async f => {
        const { readFile } = await import('fs/promises');
        const content = await readFile(path.join(scriptsDir, f), 'utf-8');
        return {
          testId: f.replace('.spec.ts', ''),
          filePath: path.join(scriptsDir, f),
          scriptContent: content,
          approved: true,
        };
      })
    );
    res.json(scripts);
  } catch {
    res.json([]);
  }
});

// GET /api/failures
app.get('/api/failures', async (_req, res) => {
  const exists = await fileExists(CONFIG.paths.failureReport);
  res.json(exists ? await readJsonFile<FailureCategory[]>(CONFIG.paths.failureReport) : []);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
```

Add `express` and `cors` to root `package.json`:
```json
"express": "^4.18.2",
"cors": "^2.8.5",
"@types/express": "^4.17.21",
"@types/cors": "^2.8.17"
```

Add a new script to root `package.json`:
```json
"api": "ts-node src/api-server.ts"
```

---

### 15.16 Running Everything Together

```bash
# Terminal 1 — Backend API server
npm run api

# Terminal 2 — Frontend dev server
cd frontend && npm run dev

# Terminal 3 — CLI pipeline (optional, runs independently)
npm start

# If using Ollama
# Terminal 4 — Ollama
ollama serve
```

Open **http://localhost:5173** in your browser.

---

### 15.17 Cursor Build Order for Frontend

```
1.  frontend/package.json           ← npm install inside frontend/
2.  frontend/vite.config.ts
3.  frontend/tsconfig.json
4.  frontend/index.html
5.  frontend/src/index.css          ← CSS variables (all components depend on these)
6.  frontend/src/types/index.ts
7.  frontend/src/api/client.ts
8.  frontend/src/main.tsx
9.  frontend/src/components/StepBadge.tsx
10. frontend/src/components/ProviderBadge.tsx
11. frontend/src/components/MetricCard.tsx
12. frontend/src/components/Sidebar.tsx    ← depends on ProviderBadge
13. frontend/src/App.tsx                   ← depends on Sidebar + all pages
14. frontend/src/pages/Dashboard.tsx
15. frontend/src/pages/TestCases.tsx
16. frontend/src/pages/Scripts.tsx
17. frontend/src/pages/Review.tsx
18. frontend/src/pages/FailureReport.tsx
19. src/api-server.ts                      ← backend bridge (install express + cors first)
```

### Cursor Prompt Template for Pages

```
"Implement frontend/src/pages/[PageName].tsx.
Use MetricCard, StepBadge, ProviderBadge from ../components/.
Fetch data with the api client from ../api/client.ts.
Use only inline React.CSSProperties styles — no CSS modules, no Tailwind.
All colors via CSS variables from index.css.
Font: var(--font-mono) for data/code, var(--font-sans) for labels.
Include a loading skeleton state and an empty state."
```

---

*Blueprint Section 15 — React + Vite Frontend*
*Version 2.0 — April 2026*
