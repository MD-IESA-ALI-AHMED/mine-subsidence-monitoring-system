import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { createMockModelApp } from './app.js';

const app = createMockModelApp({ failRate: env.MOCK_MODEL_FAIL_RATE });
app.listen(env.MOCK_MODEL_PORT, () =>
  logger.info({ port: env.MOCK_MODEL_PORT }, 'Mock model listening'),
);
