import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:4000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target, changeOrigin: false },
        '/socket.io': { target, ws: true, changeOrigin: false },
      },
    },
    build: { sourcemap: true, chunkSizeWarningLimit: 1500 },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{js,jsx}', 'tests/unit/**/*.test.{js,jsx}'],
      setupFiles: ['tests/setup.js'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  };
});
