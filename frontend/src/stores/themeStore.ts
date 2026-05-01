import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const getSystemTheme = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'dark' || (theme === 'system' && getSystemTheme())) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
applyTheme(savedTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: savedTheme,
  isDark: savedTheme === 'dark' || (savedTheme === 'system' && getSystemTheme()),

  setTheme: (theme: Theme) => {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    set({
      theme,
      isDark: theme === 'dark' || (theme === 'system' && getSystemTheme()),
    });
  },
}));

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme, setTheme } = useThemeStore.getState();
  if (theme === 'system') {
    setTheme('system'); // Re-apply
  }
});
