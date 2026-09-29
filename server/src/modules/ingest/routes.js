import { Router } from 'express';
import { ingestFramesSchema } from '@subsidence/shared';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireIngestKey } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { acceptReadings } from '../readings/accept.js';

// For the future real gateway: decoded 50-byte telemetry frames as JSON, API-key auth.
// Frames go through the same path as simulated readings, so the dashboard needs no change.
export function ingestRoutes() {
  const r = Router();
  r.post(
    '/frames',
    requireIngestKey,
    validate({ body: ingestFramesSchema }),
    asyncHandler(async (req, res) => {
      const { siteId, frames } = req.body;
      const result = await acceptReadings(siteId, frames, { source: 'ingest' });
      res.status(202).json(result);
    }),
  );
  return r;
}
