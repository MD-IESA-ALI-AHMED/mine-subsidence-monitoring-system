import { useEffect } from 'react';
import { applyTheme, useThemeStore } from '../store/themeStore.js';

/** Returns the resolved theme and keeps <html data-theme> in sync with it. */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const resolved = useThemeStore((s) => s.resolved)();
  const toggle = useThemeStore((s) => s.toggle);

  useEffect(() => applyTheme(resolved), [resolved]);

  useEffect(() => {
    if (theme) return undefined;
    const mq = matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return { theme: resolved, toggle };
}
