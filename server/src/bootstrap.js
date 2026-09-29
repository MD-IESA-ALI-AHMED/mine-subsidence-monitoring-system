import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { backfillHistory } from './services/pipeline/backfill.js';
import { startPipelineScheduler } from './services/pipeline/scheduler.js';
import { isEmpty, seedDatabase } from './services/seed/seedDatabase.js';
import { startSimulator } from './services/simulator/runSimulator.js';

/**
 * Background start-up after the server is listening: load the dummy site into an empty database,
 * replay the pipeline over the history once, then start the pipeline scheduler and the simulator.
 */
export async function bootstrap() {
  const siteId = env.DEFAULT_SITE_ID;
  if (await isEmpty()) {
    if (!env.DEMO_PASSWORD) {
      logger.warn('Database is empty and DEMO_PASSWORD is not set; run `npm run seed`');
      return {};
    }
    logger.info('Empty database: loading the dummy site');
    await seedDatabase({ demoPassword: env.DEMO_PASSWORD, log: (m) => logger.info(m) });
  }
  await backfillHistory(siteId);
  const scheduler = startPipelineScheduler();
  const simulator = env.SIMULATOR ? await startSimulator(siteId) : null;
  return { scheduler, simulator };
}
