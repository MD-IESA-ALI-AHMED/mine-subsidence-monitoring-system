import { Panel } from '../../ui/Panel.jsx';

// Temporary body for routes whose screens are built in phase 7.
export function PagePlaceholder({ title, children }) {
  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--surface-1)' }}>
      <Panel label={title}>
        <p style={{ color: 'var(--text-muted)' }}>{children}</p>
      </Panel>
    </div>
  );
}
