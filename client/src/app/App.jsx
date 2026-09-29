import { RouterProvider } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.js';
import { QueryProvider } from './providers.jsx';
import { router } from './router.jsx';

export function App() {
  useTheme();
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}
