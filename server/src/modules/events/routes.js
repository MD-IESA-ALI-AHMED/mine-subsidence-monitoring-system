import { Router } from 'express';
import { z } from 'zod';
import { EVENT_KINDS } from '@subsidence/shared';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { csv, isoDate, siteIdParam } from '../common/schemas.js';
import { listEvents } from './service.js';

const query = z.object({
  siteId: siteIdParam,
  from: isoDate.optional(),
  to: isoDate.optional(),
  kind: csv.pipe(z.array(z.enum(EVENT_KINDS))).optional(),
});

export function eventRoutes() {
  const r = Router();
  r.get(
    '/',
    validate({ query }),
    asyncHandler(async (req, res) => {
      const { siteId, ...filters } = req.query;
      res.json({ events: await listEvents(siteId, filters) });
    }),
  );
  return r;
}
