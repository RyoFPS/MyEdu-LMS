import { create } from 'zustand';
import api from '../lib/axios';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

// localStorage keys with versioning for future schema changes
const STORAGE_KEYS = {
  TOKEN: 'token:v1',
  USER: 'user:v1',
} as const;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(STORAGE_KEYS.TOKEN),
  isLoading: false,
  isInitialized: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/login', { email, password });
      const { user, token } = response.data.data;
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      set({ user, token, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/logout');
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      set({ user: null, token: null });
    }
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) return;

    set({ isLoading: true });
    try {
      const response = await api.get('/me');
      const user = response.data.data;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      set({ user, isLoading: false });
    } catch {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      set({ user: null, token: null, isLoading: false });
    }
  },

  setUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    set({ user });
  },

  initialize: async () => {
    // Cache localStorage reads to avoid multiple calls
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        set({ user, token, isInitialized: true });
        // Fetch fresh user data in background
        get().fetchUser();
      } catch {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        set({ user: null, token: null, isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },
}));
