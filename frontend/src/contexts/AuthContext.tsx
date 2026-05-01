import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { fetchCurrentUser, loginUser, logoutUser, registerUser } from '../services/auth.service';
import { clearAuthToken, getAuthToken, setAuthToken } from '../services/token.service';
import type { User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        clearAuthToken();
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(username: string, password: string) {
        const payload = await loginUser(username, password);
        setAuthToken(payload.token);
        setUser(payload.user);
      },
      async register(username: string, password: string) {
        const payload = await registerUser(username, password);
        setAuthToken(payload.token);
        setUser(payload.user);
      },
      async logout() {
        try {
          await logoutUser();
        } catch {
          // 前端退出以清理本地 token 为准，后端失败时也不阻断用户退出。
        } finally {
          clearAuthToken();
          setUser(null);
        }
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
