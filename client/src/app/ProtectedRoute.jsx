import { Navigate, useLocation } from 'react-router-dom';
import { useMe } from '../services/queries.js';

/** Renders children only for a signed-in user; otherwise sends them to /login?next=… */
export function ProtectedRoute({ children }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending)
    return <div style={{ height: '100%', background: 'var(--bg)' }} aria-busy="true" />;
  if (me.isError || !me.data) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}
