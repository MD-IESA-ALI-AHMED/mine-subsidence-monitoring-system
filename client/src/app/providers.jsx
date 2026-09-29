import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { setAuthLostHandler } from '../services/api.js';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, err) =>
          err?.response?.status !== 401 && err?.response?.status !== 404 && count < 2,
        refetchOnWindowFocus: false,
        staleTime: 15_000,
      },
    },
  });
}

export function QueryProvider({ children }) {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** When the session cannot be refreshed: clear state and go to /login, keeping the intended path. */
export function AuthLostBridge() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    setAuthLostHandler(() => {
      qc.clear();
      if (location.pathname !== '/login') {
        const next = encodeURIComponent(location.pathname + location.search);
        navigate(`/login?next=${next}`, { replace: true });
      }
    });
  }, [qc, navigate, location]);
  return null;
}
