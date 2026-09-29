import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';

// Phase 1 placeholder: proves tokens, fonts and the theme toggle. Replaced by the router in phase 5.
export function App() {
  const { theme, toggle } = useTheme();
  return (
    <div style={{ padding: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <span className="section-label">Site 01</span>
        <span className="mono">42.0 mm</span>
        <button
          type="button"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 3 }}
        >
          {theme === 'dark' ? (
            <Sun size={16} strokeWidth={1.5} />
          ) : (
            <Moon size={16} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
