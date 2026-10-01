import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { EMBEDDED_MODEL_PATH, env } from './config/env.js';
import { logger } from './config/logger.js';
import { createMockModelApp } from './mockModel/app.js';
import { errorHandler } from './middleware/error.js';
import { notFound } from './middleware/notFound.js';
import { apiRouter } from './routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // One proxy hop in front (Render); the client's IP is the last X-Forwarded-For entry it adds.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(compression());

  // Without MODEL_URL the mock model runs here, with its own body limit, on the same HTTP
  // contract the real model will use; the pipeline calls it like any remote model.
  if (env.embeddedModel) {
    app.use(EMBEDDED_MODEL_PATH, createMockModelApp({ failRate: env.MOCK_MODEL_FAIL_RATE }));
  }

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/system/health' || req.url.startsWith(EMBEDDED_MODEL_PATH),
      },
    }),
  );

  app.get('/', (_req, res) =>
    res.json({ service: 'subsidence-api', health: '/api/system/health', ready: '/api/system/ready' }),
  );
  app.use('/api', apiRouter());

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
