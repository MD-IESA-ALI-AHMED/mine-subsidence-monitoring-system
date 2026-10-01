import { markReady } from './bootstrapState.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { backfillHistory } from './services/pipeline/backfill.js';
import { startPipelineScheduler } from './services/pipeline/scheduler.js';
import { syncDemoUser } from './services/seed/demoUser.js';
import { isEmpty, seedDatabase } from './services/seed/seedDatabase.js';
import { startSimulator } from './services/simulator/runSimulator.js';
import { resetSiteClocks } from './services/time/siteClock.js';

const seedOptions = () => ({
  demoPassword: env.DEMO_PASSWORD,
  demoEmail: env.DEMO_EMAIL,
  log: (m) => logger.info(m),
});

/**
 * Background start-up after the server is listening:
 * 1. an empty database (a fresh Atlas cluster) gets the dummy site and the demo account;
 * 2. the pipeline is replayed over the 7-day history once (zones, alerts, scrubber marks);
 * 3. the pipeline scheduler and the live simulator start.
 * When the simulator reaches SIM_LOOP_DAYS of live data, the site data is reloaded (accounts
 * kept) and the story replays, so the database stays small.
 */
export async function bootstrap() {
  const siteId = env.DEFAULT_SITE_ID;
  if (await isEmpty()) {
    if (!env.DEMO_PASSWORD) {
      logger.warn('Database is empty and DEMO_PASSWORD is not set; nothing to load');
      markReady();
      return {};
    }
    logger.info('Empty database: loading the dummy site');
    await seedDatabase(seedOptions());
  } else {
    await syncDemoUser(env.DEMO_PASSWORD, env.DEMO_EMAIL);
  }
  await backfillHistory(siteId);
  const scheduler = startPipelineScheduler();

  let simulator = null;
  const replay = async () => {
    try {
      logger.info('Live story finished: reloading the dummy site to replay it');
      simulator?.stop();
      await seedDatabase({ ...seedOptions(), keepAccounts: true });
      resetSiteClocks();
      scheduler.reset();
      await backfillHistory(siteId);
      simulator = await startSimulator(siteId, { onLoopEnd: replay });
    } catch (err) {
      logger.error({ err }, 'Replay failed');
    }
  };
  if (env.SIMULATOR) simulator = await startSimulator(siteId, { onLoopEnd: replay });

  markReady();
  logger.info({ demo: env.DEMO_EMAIL }, 'Ready');
  return { scheduler, simulator: { stop: () => simulator?.stop() } };
}
