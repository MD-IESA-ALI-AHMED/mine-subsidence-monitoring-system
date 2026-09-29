import express from 'express';
import { modelRequestSchema, modelResponseSchema } from '@subsidence/shared';
import { forecastNode, forecastZones } from './forecast.js';

export const MOCK_MODEL_VERSION = 'mock-1';

/** The mock's answer to a (valid) request. Pure; checked against the shared response schema. */
export function mockPredict(request) {
  const nodes = request.nodes.map((n) => forecastNode(n, request));
  const body = {
    requestId: request.requestId,
    modelVersion: MOCK_MODEL_VERSION,
    nodes: nodes.map(({ _validFraction, _accelerating, ...n }) => n),
    zones: forecastZones(request, nodes),
  };
  // The mock holds itself to the same contract the backend enforces.
  return modelResponseSchema.parse(body);
}

/**
 * Separate Express app implementing the same HTTP contract as the real model server.
 * opts.failRate: share of calls answered with 503; opts.latencyMs: [min, max] added delay.
 */
export function createMockModelApp({
  failRate = 0.02,
  latencyMs = [150, 400],
  random = Math.random,
} = {}) {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', modelVersion: MOCK_MODEL_VERSION }));

  app.post('/predict', async (req, res) => {
    const parsed = modelRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.slice(0, 5) });
    const [lo, hi] = latencyMs;
    await new Promise((r) => setTimeout(r, lo + random() * (hi - lo)));
    if (random() < failRate) return res.status(503).json({ error: 'Model busy' });
    return res.json(mockPredict(parsed.data));
  });
  return app;
}
