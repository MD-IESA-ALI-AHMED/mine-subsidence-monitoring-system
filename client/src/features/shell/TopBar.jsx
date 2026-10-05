import { ChevronDown, Moon, PanelLeft, PanelRight, Sun } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme.js';
import { useAlerts, useSite } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { IconButton } from '../../ui/Button.jsx';
import { formatTime } from '../../utils/time.js';
import { StatusStrip } from './StatusStrip.jsx';
import s from './TopBar.module.css';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/alerts', label: 'Alerts', count: true },
  { to: '/network', label: 'Network' },
  { to: '/settings', label: 'Settings' },
];

function Clock() {
  const now = useSiteNow();
  const hour12 = useUiStore((st) => st.settings.hour12);
  return (
    <span className={s.clock} aria-label="Site time">
      {formatTime(now, { hour12 })}
      <small>IST</small>
    </span>
  );
}

export function TopBar() {
  const { data: site } = useSite();
  const { data: open } = useAlerts({ state: ['open'] });
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const ui = useUiStore();
  const select = useSelectionStore((st) => st.select);
  const openCount = open?.length ?? 0;
  const openCritical = open?.some((a) => a.tier === 'critical');
  const extracting = site?.panels?.find((p) => p.extractionStatus === 'extracting');

  return (
    <header className={s.bar}>
      {openCritical && <div className={s.criticalLine} title="Open critical alert" />}
      <div className={s.brand}>
        <img src="/mark.svg" alt="" width={20} height={20} />
        <button
          type="button"
          className={s.site}
          title="Frame the active panel"
          onClick={() => extracting && select('panel', extracting.panelId)}
        >
          <span>{site?.name ?? 'Site'}</span>
          {extracting && (
            <span className={`mono ${s.panelName}`}>· Panel {extracting.panelId}</span>
          )}
          <ChevronDown size={12} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <nav className={s.nav} aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={s.link}>
            {n.label}
            {n.count && openCount > 0 && <span className={s.count}>({openCount})</span>}
          </NavLink>
        ))}
      </nav>

      <StatusStrip />

      <div className={s.right}>
        <Clock />
        {pathname === '/' && (
          <>
            <IconButton
              icon={PanelLeft}
              label={ui.railCollapsed ? 'Show zones and alerts' : 'Hide zones and alerts'}
              active={!ui.railCollapsed}
              onClick={ui.toggleRail}
            />
            <IconButton
              icon={PanelRight}
              label={ui.panelCollapsed ? 'Show details panel' : 'Hide details panel'}
              active={!ui.panelCollapsed}
              onClick={ui.togglePanel}
            />
          </>
        )}
        <IconButton
          icon={theme === 'dark' ? Sun : Moon}
          label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          onClick={toggle}
        />
      </div>
    </header>
  );
}
