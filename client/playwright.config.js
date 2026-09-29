import { defineConfig } from '@playwright/test';

// End-to-end tests run their own copy of the stack on separate ports and a separate database
// (reset first), so they never touch a running `npm run dev`. MongoDB must be running
// (`npm run mongo`, or `npm run dev` in another terminal).
const API_PORT = 4210;
const MODEL_PORT = 8210;
const WEB_PORT = 5210;
export const E2E_PASSWORD = 'e2e-demo-password';

const serverEnv = {
  PORT: String(API_PORT),
  MONGO_URI: 'mongodb://127.0.0.1:27017/subsidence-e2e',
  MODEL_URL: `http://localhost:${MODEL_PORT}`,
  DEMO_PASSWORD: E2E_PASSWORD,
  LOG_LEVEL: 'warn',
  SIMULATOR: 'on',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1440, height: 900 },
    // Software WebGL so the 3D scene renders on machines and CI runners without a GPU.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    acceptDownloads: true,
  },
  webServer: [
    {
      command: 'node src/mockModel/index.js',
      cwd: '../server',
      port: MODEL_PORT,
      env: { MOCK_MODEL_PORT: String(MODEL_PORT), MOCK_MODEL_FAIL_RATE: '0', LOG_LEVEL: 'warn' },
      reuseExistingServer: false,
    },
    {
      command: 'node scripts/resetDb.js && node src/server.js',
      cwd: '../server',
      url: `http://localhost:${API_PORT}/api/system/ready`,
      env: serverEnv,
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
