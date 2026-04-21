import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from '../lib/theme';

const DISABLED_THEME: Theme = 'light';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DISABLED_THEME);

  useEffect(() => {
    applyTheme(DISABLED_THEME);
  }, []);

  const setTheme = useCallback((_nextTheme: Theme) => {
    setThemeState(DISABLED_THEME);
    applyTheme(DISABLED_THEME);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(DISABLED_THEME);
    applyTheme(DISABLED_THEME);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
