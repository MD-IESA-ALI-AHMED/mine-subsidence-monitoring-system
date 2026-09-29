import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './uiStore.js';

const systemTheme = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';

/** Theme follows the system on first visit, then remembers the user's choice. */
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: null,
      resolved: () => get().theme ?? systemTheme(),
      toggle: () => set({ theme: get().resolved() === 'dark' ? 'light' : 'dark' }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'theme', storage: safeStorage, partialize: (s) => ({ theme: s.theme }) },
  ),
);

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}
