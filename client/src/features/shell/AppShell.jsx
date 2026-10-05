import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLiveUpdates } from '../../hooks/useLiveUpdates.js';
import { useStatus } from '../../services/queries.js';
import { useLiveStore } from '../../store/liveStore.js';
import { slideIn } from '../intro/slideIn.js';
import { useIntroUi } from '../intro/useIntroTimeline.js';
import { Toasts } from './Toasts.jsx';
import { TopBar } from './TopBar.jsx';
import s from './AppShell.module.css';

/** Top bar + page. Owns the live connection for the signed-in session. */
export function AppShell() {
  const location = useLocation();
  const { data: status } = useStatus();
  const introUi = useIntroUi(location.pathname === '/');
  useLiveUpdates({ enabled: true });

  useEffect(() => {
    if (status?.siteClock) {
      useLiveStore
        .getState()
        .observeSiteTime(new Date(status.siteClock).getTime(), status.simSpeed);
      useLiveStore.getState().tick();
    }
  }, [status?.siteClock, status?.simSpeed]);

  return (
    <div className={s.shell}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div style={slideIn(introUi, 'top')}>
        <TopBar />
      </div>
      <main className={s.main} id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Toasts />
    </div>
  );
}
