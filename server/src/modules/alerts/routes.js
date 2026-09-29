import { Router } from 'express';
import { z } from 'zod';
import { ALERT_STATES, TIERS } from '@subsidence/shared';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { csv, siteIdParam } from '../common/schemas.js';
import * as c from './controller.js';

const listQuery = z.object({
  siteId: siteIdParam,
  state: csv.pipe(z.array(z.enum(ALERT_STATES))).optional(),
  tier: csv.pipe(z.array(z.enum(TIERS))).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});
const idParams = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid alert ID') });
const noteBody = z.object({
  note: z.string().trim().min(5, 'Note must be at least 5 characters').max(1000),
});

export function alertRoutes() {
  const r = Router();
  r.get('/', validate({ query: listQuery }), asyncHandler(c.list));
  r.post(
    '/:id/acknowledge',
    validate({ params: idParams, body: noteBody }),
    asyncHandler(c.acknowledge),
  );
  r.post('/:id/resolve', validate({ params: idParams, body: noteBody }), asyncHandler(c.resolve));
  return r;
}
