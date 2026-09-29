import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { isoDate, siteIdParam } from '../common/schemas.js';
import { zoneHistory, zonesAt } from './service.js';

const listQuery = z.object({
  siteId: siteIdParam,
  active: z.enum(['true', 'false']).default('true'),
  at: isoDate.optional(),
});
const historyParams = z.object({ zoneKey: z.string().regex(/^Z-[A-Z0-9-]{1,24}$/) });
const historyQuery = z.object({ siteId: siteIdParam, from: isoDate.optional() });

export function zoneRoutes() {
  const r = Router();
  r.get(
    '/',
    validate({ query: listQuery }),
    asyncHandler(async (req, res) => {
      res.json({ zones: await zonesAt(req.query.siteId, req.query.at) });
    }),
  );
  r.get(
    '/:zoneKey/history',
    validate({ params: historyParams, query: historyQuery }),
    asyncHandler(async (req, res) => {
      const { siteId, from } = req.query;
      res.json({ history: await zoneHistory(siteId, req.params.zoneKey, { from }) });
    }),
  );
  return r;
}
