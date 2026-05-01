import { create } from 'zustand';
import { storage } from '@/lib/storage';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setAuth: (user: User, token: string) => void;
  clearAuth: () => Promise<void>;
  loadToken: () => Promise<string | null>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  clearAuth: async () => {
    await storage.deleteItem('adhams_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  loadToken: async () => {
    const token = await storage.getItem('adhams_token');
    if (token) {
      set({ token });
    }
    return token;
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
