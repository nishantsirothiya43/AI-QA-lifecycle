import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { FailureCategory } from '../types';

export function useFailures() {
  const [data, setData] = useState<FailureCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFailures()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, setData };
}
