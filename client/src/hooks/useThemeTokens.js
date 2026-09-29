import { useEffect, useState } from 'react';
import { applyTheme } from '../store/themeStore.js';
import { useTheme } from './useTheme.js';

const TOKENS = [
  'bg',
  'surface-1',
  'surface-2',
  'line',
  'line-strong',
  'text',
  'text-muted',
  'text-faint',
  'accent',
  'tier-normal',
  'tier-watch',
  'tier-warning',
  'tier-critical',
  'offline',
];

function readTokens(theme) {
  const css = getComputedStyle(document.documentElement);
  const out = { theme };
  for (const t of TOKENS) {
    out[t.replace(/-(\w)/g, (_, c) => c.toUpperCase())] =
      css.getPropertyValue(`--${t}`).trim() || '#808080';
  }
  out.tier = {
    normal: out.tierNormal,
    watch: out.tierWatch,
    warning: out.tierWarning,
    critical: out.tierCritical,
  };
  return out;
}

/**
 * Theme tokens as concrete colours, for canvas and WebGL code (uPlot, three.js) that cannot read
 * CSS variables. Re-read after the theme attribute changes.
 */
export function useThemeTokens() {
  const { theme } = useTheme();
  const [tokens, setTokens] = useState(() => readTokens(theme));
  useEffect(() => {
    applyTheme(theme);
    setTokens(readTokens(theme));
  }, [theme]);
  return tokens;
}
