import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { AppShell } from '../features/shell/AppShell.jsx';
import { AuthLostBridge } from './providers.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

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
  return (
    <>
      <AuthLostBridge />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: (
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        ),
        children: [
          { path: '/', element: page(OverviewPage) },
          { path: '/alerts', element: page(AlertsPage) },
          { path: '/network', element: page(NetworkPage) },
          { path: '/settings', element: page(SettingsPage) },
          { path: '*', element: page(OverviewPage) },
        ],
      },
    ],
  },
]);
