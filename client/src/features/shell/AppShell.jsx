import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: status } = useStatus();
  const introUi = useIntroUi(location.pathname === '/');

  const onAuthLost = useCallback(() => {
    qc.clear();
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
  }, [qc, navigate, location.pathname]);

  useLiveUpdates({ enabled: true, onAuthLost });

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
      <div style={slideIn(introUi, 'top')}>
        <TopBar />
      </div>
      <main className={s.main}>
        <Outlet />
      </main>
      <Toasts />
    </div>
  );
}
