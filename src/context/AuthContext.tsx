/**
 * AuthContext — manages login state, JWT tokens, and auto-refresh.
 * Wraps the entire app. Every protected route checks useAuth().user.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { secureGet, secureSet, secureRemove } from '../lib/secureStore';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const LS_ACCESS  = 'cactus_access';
const LS_REFRESH = 'cactus_refresh';
const isNativePlatform = Capacitor.isNativePlatform();

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
  updateProfile: (data: { name?: string; avatarUrl?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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

  // The refresh token (30-day, sensitive) lives in the device secure store on native
  // (Keychain/Keystore) instead of localStorage; on web it falls back to localStorage.
  const getRefreshToken = async () => (await secureGet(LS_REFRESH)) ?? localStorage.getItem(LS_REFRESH);
  const setTokens = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem(LS_ACCESS, accessToken);
    await secureSet(LS_REFRESH, refreshToken);
    // Clean up any legacy plaintext refresh token left in localStorage on native.
    if (isNativePlatform) localStorage.removeItem(LS_REFRESH);
  };
  const clearTokens = async () => {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    await secureRemove(LS_REFRESH);
  };

  // Auto-refresh access token using refresh token
  const refresh = useCallback(async (): Promise<boolean> => {
    const rt = await getRefreshToken();
    if (!rt) return false;
    try {
      const data = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rt }),
      });
      await setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      await clearTokens();
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

  // Proactive token refresh — schedule a refresh ~60s before the access token expires
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const scheduleRefresh = () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt: number = payload.exp * 1000;
        const delay = expiresAt - Date.now() - 60_000;
        if (delay <= 0) {
          // Already expired or about to — refresh immediately
          refresh().then((ok) => {
            if (!ok) logout();
            else scheduleRefresh();
          });
          return;
        }
        timerId = setTimeout(async () => {
          const ok = await refresh();
          if (!ok) {
            logout();
          } else {
            scheduleRefresh(); // chain next refresh for the new token
          }
        }, delay);
      } catch {
        // Malformed token — let the server reject it naturally
      }
    };

    if (user) scheduleRefresh();
    return () => clearTimeout(timerId);
  }, [user]); // re-schedule whenever user changes (login/logout)

  // Interceptor: add auth header to all API calls
  // Components use getAccessToken() to build headers themselves.

  const login = async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    const rt = await getRefreshToken();
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ refreshToken: rt }),
      });
    } catch { /* ignore */ }
    await clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  // Update your own profile (name / avatar) — persists to the backend and refreshes
  // the local user so the change shows everywhere (web + app) immediately.
  const updateProfile = async (data: { name?: string; avatarUrl?: string }) => {
    const updated = await apiFetch('/auth/me', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      body: JSON.stringify(data),
    });
    setUser(updated);
  };

  // Change your own password (verifies the current one server-side).
  const changePassword = async (currentPassword: string, newPassword: string) => {
    await apiFetch('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, getAccessToken, updateProfile, changePassword }}>
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
