import { Router } from 'express';
import { isReady } from './bootstrapState.js';
import { asyncHandler } from './middleware/asyncHandler.js';
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

/** Mounts the public dashboard API; data ingestion still requires its API key. */
export function apiRouter() {
  const router = Router();
  router.get(
    '/system/health',
    asyncHandler(async (_req, res) => res.json(await getHealth())),
  );
  // Readiness (no auth): 503 until the dummy site is loaded and the history replayed.
  router.get('/system/ready', (_req, res) =>
    isReady() ? res.json({ ready: true }) : res.status(503).json({ ready: false }),
  );
  router.use('/auth', authRoutes());
  router.use('/ingest', ingestRoutes());

  const publicRoutes = {
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
  for (const [prefix, routes] of Object.entries(publicRoutes)) {
    router.use(prefix, apiLimiter, routes);
  }
  return router;
}
