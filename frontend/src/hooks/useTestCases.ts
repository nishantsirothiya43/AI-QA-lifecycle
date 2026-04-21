import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { TestCase } from '../types';

export function useTestCases() {
  const [data, setData] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getTestCases()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, setData };
}
