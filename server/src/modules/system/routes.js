import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { notFound } from '../../middleware/error.js';
import { validate } from '../../middleware/validate.js';
import { siteIdParam } from '../common/schemas.js';
import { getStatus } from './service.js';

export function systemRoutes() {
  const r = Router();
  r.get(
    '/status',
    validate({ query: z.object({ siteId: siteIdParam }) }),
    asyncHandler(async (req, res) => {
      const status = await getStatus(req.query.siteId);
      if (!status) throw notFound('No status for this site yet');
      res.json({ status });
    }),
  );
  return r;
}
