import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { isoDate, siteIdParam } from '../common/schemas.js';
import * as c from './controller.js';

const params = z.object({ siteId: siteIdParam });
const terrainQuery = z.object({
  res: z.coerce.number().min(2).max(20).default(4),
  at: isoDate.optional(),
});
const speedQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  step: z.coerce.number().int().min(10).max(1440).default(60),
});

export function siteRoutes() {
  const r = Router();
  r.get('/:siteId', validate({ params }), asyncHandler(c.getSite));
  r.get('/:siteId/terrain', validate({ params, query: terrainQuery }), asyncHandler(c.getTerrain));
  r.get(
    '/:siteId/speed-history',
    validate({ params, query: speedQuery }),
    asyncHandler(c.getSpeedHistory),
  );
  return r;
}
