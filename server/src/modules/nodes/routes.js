import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { csv, isoDate, nodeId, siteIdParam } from '../common/schemas.js';
import { SERIES_FIELDS } from '../readings/service.js';
import * as c from './controller.js';

const idParams = z.object({ id: nodeId });
const listQuery = z.object({ siteId: siteIdParam, at: isoDate.optional() });
const readingsQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  fields: z
    .string()
    .default('sinking_mm,speed_mmPerDay,tiltX_urad,tiltY_urad,temp_C')
    .pipe(csv)
    .pipe(z.array(z.enum(SERIES_FIELDS)).min(1)),
  step: z.coerce.number().int().min(1).max(1440).optional(),
});

export function nodeRoutes() {
  const r = Router();
  r.get('/', validate({ query: listQuery }), asyncHandler(c.list));
  r.get('/:id', validate({ params: idParams }), asyncHandler(c.getOne));
  r.get(
    '/:id/readings',
    validate({ params: idParams, query: readingsQuery }),
    asyncHandler(c.readings),
  );
  return r;
}
