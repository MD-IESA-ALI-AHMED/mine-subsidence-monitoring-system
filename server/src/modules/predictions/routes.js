import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { nodeId, siteIdParam } from '../common/schemas.js';
import { latestPrediction, nodePredictions } from './service.js';

export function predictionRoutes() {
  const r = Router();
  r.get(
    '/latest',
    validate({ query: z.object({ siteId: siteIdParam }) }),
    asyncHandler(async (req, res) => {
      res.json({ prediction: await latestPrediction(req.query.siteId) });
    }),
  );
  r.get(
    '/node/:id',
    validate({
      params: z.object({ id: nodeId }),
      query: z.object({ limit: z.coerce.number().int().min(1).max(50).default(5) }),
    }),
    asyncHandler(async (req, res) => {
      res.json({ predictions: await nodePredictions(req.params.id, req.query.limit) });
    }),
  );
  return r;
}
