import express from 'express';

/** Separate Express app implementing the same HTTP contract as the real model server. */
export function createMockModelApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', modelVersion: 'mock-1' }));
  return app;
}
