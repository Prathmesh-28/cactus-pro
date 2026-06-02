/**
 * AuthContext — manages login state, JWT tokens, and auto-refresh.
 * Wraps the entire app. Every protected route checks useAuth().user.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const LS_ACCESS  = 'cactus_access';
const LS_REFRESH = 'cactus_refresh';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'portfolio_team' | 'finance_team' | 'investment_team';
  avatarUrl?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

const Ctx = createContext<AuthContextValue | null>(null);

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const getAccessToken = () => localStorage.getItem(LS_ACCESS);

  // Auto-refresh access token using refresh token
  const refresh = useCallback(async (): Promise<boolean> => {
    const rt = localStorage.getItem(LS_REFRESH);
    if (!rt) return false;
    try {
      const data = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rt }),
      });
      localStorage.setItem(LS_ACCESS,  data.accessToken);
      localStorage.setItem(LS_REFRESH, data.refreshToken);
      return true;
    } catch {
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem(LS_REFRESH);
      return false;
    }
  }, []);

  // Load user from /auth/me on mount
  useEffect(() => {
    const init = async () => {
      const token = getAccessToken();
      if (!token) {
        // Try refresh
        const ok = await refresh();
        if (!ok) { setLoading(false); return; }
      }
      try {
        const me = await apiFetch('/auth/me', {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        });
        setUser(me);
      } catch {
        // Token invalid — try refresh
        const ok = await refresh();
        if (ok) {
          try {
            const me = await apiFetch('/auth/me', {
              headers: { Authorization: `Bearer ${getAccessToken()}` },
            });
            setUser(me);
          } catch { /* give up */ }
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Interceptor: add auth header to all API calls
  // Components use getAccessToken() to build headers themselves.

  const login = async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(LS_ACCESS,  data.accessToken);
    localStorage.setItem(LS_REFRESH, data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    const rt = localStorage.getItem(LS_REFRESH);
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ refreshToken: rt }),
      });
    } catch { /* ignore */ }
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, getAccessToken }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

// Authenticated fetch helper — auto-attaches JWT
export async function authFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(LS_ACCESS);
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
}
