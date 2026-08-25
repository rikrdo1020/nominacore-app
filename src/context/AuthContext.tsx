import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getMe, login as loginRequest } from '../lib/api/auth';
import { queryKeys } from '../lib/query-keys';
import type { AuthUser } from '../types/api';

const TOKEN_KEY = 'nominacore_token';
const USER_KEY = 'nominacore_user';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.api.setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    navigate('/login', { replace: true });
  }, [clearSession, navigate]);

  // Hydrate optimistically from localStorage on mount.
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = readStoredUser();
    if (storedToken && storedUser) {
      window.api.setAuthToken(storedToken);
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe once to 401 notifications from the preload layer.
  useEffect(() => {
    const unsubscribe = window.api.onUnauthorized(() => logout());
    return unsubscribe;
  }, [logout]);

  // Validate the hydrated token in the background; log out silently on failure.
  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getMe,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (meQuery.isError) {
      clearSession();
    }
  }, [meQuery.isError, clearSession]);

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
      localStorage.setItem(USER_KEY, JSON.stringify(meQuery.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.data]);

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      loginRequest(username, password),
    onSuccess: ({ accessToken, user: loggedInUser }) => {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
      window.api.setAuthToken(accessToken);
      setToken(accessToken);
      setUser(loggedInUser);
      navigate('/employees', { replace: true });
    },
  });

  const login = useCallback(
    async (username: string, password: string) => {
      await loginMutation.mutateAsync({ username, password });
    },
    [loginMutation]
  );

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
