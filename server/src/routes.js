import { Router } from 'express';
import { asyncHandler } from './middleware/asyncHandler.js';
import { getHealth } from './modules/system/health.js';

/** Mounts every module router under /api. */
export function apiRouter() {
  const router = Router();
  router.get(
    '/system/health',
    asyncHandler(async (_req, res) => res.json(await getHealth())),
  );
  return router;
}
