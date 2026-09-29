import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { recordAudit } from '../audit/service.js';
import { csv, isoDate, nodeId, siteIdParam } from '../common/schemas.js';
import { exportFilename, streamReadingsCsv } from './service.js';

const query = z
  .object({
    siteId: siteIdParam,
    nodeIds: csv.pipe(z.array(nodeId).min(1).max(60)),
    from: isoDate,
    to: isoDate,
  })
  .refine((q) => q.from < q.to, { message: 'from must be before to', path: ['from'] })
  .refine((q) => q.to - q.from <= 31 * 86_400_000, {
    message: 'Range is limited to 31 days',
    path: ['to'],
  });

export function exportRoutes() {
  const r = Router();
  r.get(
    '/readings.csv',
    validate({ query }),
    asyncHandler(async (req, res) => {
      const { siteId, nodeIds, from, to } = req.query;
      const filename = exportFilename(siteId, nodeIds, from, to);
      await recordAudit({
        userId: req.user.id,
        action: 'export_csv',
        target: filename,
        details: { nodeIds, from, to },
      });
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      });
      await streamReadingsCsv(res, { siteId, nodeIds, from, to });
    }),
  );
  return r;
}
