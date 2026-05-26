'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser } from './api';
import { getSession, signOut as apiSignOut } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

const LS_KEY = 'wh_user_hint';

function readUserHint(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Start null (SSR-safe). useEffect seeds from localStorage then confirms via API.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      const u = session?.user ?? null;
      setUser(u);
      if (u) localStorage.setItem(LS_KEY, JSON.stringify(u));
      else localStorage.removeItem(LS_KEY);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiSignOut();
    localStorage.removeItem(LS_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    // Immediately apply localStorage hint so navbar/pages don't flash "Sign in"
    const hint = readUserHint();
    if (hint) {
      setUser(hint);
      setLoading(false);
    }
    // Then confirm with API (updates/clears if session expired)
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
