import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { isoDate, siteIdParam } from '../common/schemas.js';
import { meshHistory, meshStateAt } from './service.js';

const query = z.object({ siteId: siteIdParam, at: isoDate.optional() });
const historyQuery = z.object({ siteId: siteIdParam, from: isoDate, to: isoDate });

export function linkRoutes() {
  const r = Router();
  r.get(
    '/',
    validate({ query }),
    asyncHandler(async (req, res) => {
      const s = await meshStateAt(req.query.siteId, req.query.at);
      res.json({
        rootId: s.rootId,
        degraded: Boolean(s.degraded),
        reason: s.reason ?? null,
        down: s.down ?? [],
        since: s.ts,
        links: s.links.map(({ from, to, kind, quality_0to1 }) => ({
          from,
          to,
          kind,
          quality_0to1,
        })),
      });
    }),
  );
  r.get(
    '/history',
    validate({ query: historyQuery }),
    asyncHandler(async (req, res) => {
      const { siteId, from, to } = req.query;
      res.json({ states: await meshHistory(siteId, from, to) });
    }),
  );
  return r;
}
