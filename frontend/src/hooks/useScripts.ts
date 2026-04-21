import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ScriptFile } from '../types';

export function useScripts() {
  const [data, setData] = useState<ScriptFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getScripts()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, setData };
}
