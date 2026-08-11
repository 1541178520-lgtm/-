import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SessionAdmin } from '../../shared/contracts';
import { api, jsonBody } from '../api/client';
import { AuthContext, type AuthContextValue } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<SessionAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<{ admin: SessionAdmin }>('/auth/me')
      .then((result) => { if (active) setAdmin(result.admin); })
      .catch(() => { if (active) setAdmin(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    admin,
    loading,
    async login(username, password) {
      const result = await api<{ admin: SessionAdmin }>('/auth/login', {
        method: 'POST',
        body: jsonBody({ username, password }),
      });
      setAdmin(result.admin);
    },
    async logout() {
      try {
        await api<void>('/auth/logout', { method: 'POST' });
      } finally {
        setAdmin(null);
      }
    },
  }), [admin, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
