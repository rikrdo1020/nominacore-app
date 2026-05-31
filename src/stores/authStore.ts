import { create } from 'zustand';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

const TOKEN_KEY = 'nc_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    const res = await window.api.login(username, password);
    const token = res.access_token;
    sessionStorage.setItem(TOKEN_KEY, token);
    window.api.setAuthToken(token);
    const me = await window.api.getMe();
    set({ user: me as User, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    window.api.clearAuthToken();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  restoreSession: async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      window.api.setAuthToken(token);
      const me = await window.api.getMe();
      set({ user: me as User, isAuthenticated: true, isLoading: false });
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      window.api.clearAuthToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
