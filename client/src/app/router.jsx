import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '../features/shell/AppShell.jsx';

const OverviewPage = lazy(() => import('../features/overview/OverviewPage.jsx'));
const AlertsPage = lazy(() => import('../features/alerts/AlertsPage.jsx'));
const NetworkPage = lazy(() => import('../features/network/NetworkPage.jsx'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage.jsx'));

const page = (Component) => (
  <Suspense fallback={null}>
    <Component />
  </Suspense>
);

function Root() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: page(OverviewPage) },
          { path: '/alerts', element: page(AlertsPage) },
          { path: '/network', element: page(NetworkPage) },
          { path: '/settings', element: page(SettingsPage) },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
