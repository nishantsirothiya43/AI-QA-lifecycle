import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { PipelineStatus } from './types';
import { api } from './api/client';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TestCases from './pages/TestCases';
import Scripts from './pages/Scripts';
import Review from './pages/Review';
import FailureReport from './pages/FailureReport';
import TestExecution from './pages/TestExecution';

export default function App() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const location = useLocation();

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => setStatus(null));
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'radial-gradient(circle at 20% 0%, #141a2d 0%, var(--bg-base) 35%)' }}>
      <Sidebar status={status} />
      <main
        style={{
          flex: 1,
          padding: 22,
          overflow: 'auto',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard status={status} />} />
          <Route path="/test-cases" element={<TestCases />} />
          <Route path="/scripts" element={<Scripts />} />
          <Route path="/execution" element={<TestExecution />} />
          <Route path="/review" element={<Review />} />
          <Route path="/failures" element={<FailureReport />} />
        </Routes>
      </main>
    </div>
  );
}
