import { Router } from 'express';
import { asyncHandler } from './middleware/asyncHandler.js';
import { requireAuth } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { alertRoutes } from './modules/alerts/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { eventRoutes } from './modules/events/routes.js';
import { exportRoutes } from './modules/export/routes.js';
import { ingestRoutes } from './modules/ingest/routes.js';
import { linkRoutes } from './modules/links/routes.js';
import { nodeRoutes } from './modules/nodes/routes.js';
import { predictionRoutes } from './modules/predictions/routes.js';
import { siteRoutes } from './modules/sites/routes.js';
import { zoneRoutes } from './modules/zones/routes.js';
import { getHealth } from './modules/system/health.js';
import { systemRoutes } from './modules/system/routes.js';

/** Mounts every module router under /api. Everything except auth, health and ingest needs a session. */
export function apiRouter() {
  const router = Router();
  router.get(
    '/system/health',
    asyncHandler(async (_req, res) => res.json(await getHealth())),
  );
  router.use('/auth', authRoutes());
  router.use('/ingest', ingestRoutes());

  const secured = {
    '/system': systemRoutes(),
    '/sites': siteRoutes(),
    '/nodes': nodeRoutes(),
    '/links': linkRoutes(),
    '/zones': zoneRoutes(),
    '/predictions': predictionRoutes(),
    '/events': eventRoutes(),
    '/alerts': alertRoutes(),
    '/export': exportRoutes(),
  };
  for (const [prefix, routes] of Object.entries(secured)) {
    router.use(prefix, apiLimiter, requireAuth, routes);
  }
  return router;
}
