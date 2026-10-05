import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
