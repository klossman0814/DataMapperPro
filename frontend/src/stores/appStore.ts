import { create } from 'zustand';
import type { User } from '../types';

interface AppState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  user: User | null;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setUser: (user: User | null) => void;
  isAuthenticated: () => boolean;
  logout: () => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
};

export const useAppStore = create<AppState>((set, get) => ({
  theme: getInitialTheme(),
  sidebarOpen: true,
  user: null,

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setUser: (user) => set({ user }),

  isAuthenticated: () => {
    return !!get().user && !!localStorage.getItem('accessToken');
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    set({ user: null });
  },
}));
