import { logger } from '../../config/logger.js';
import { Site } from '../../modules/sites/model.js';
import { SystemStatus } from '../../modules/system/model.js';
import { Zone } from '../../modules/zones/model.js';
import { addMinutes } from '../time/siteTime.js';
import { runPipeline } from './runPipeline.js';

const STEP_MIN = 120;

/**
 * Replays the pipeline over the seeded history (without the model) so zones, their scores and the
 * alerts they raised exist for the whole 7 days: the time scrubber and alert feed need them.
 * Then one live run at the end of the history, with the model. Skipped if zones already exist.
 */
export async function backfillHistory(siteId) {
  if (await Zone.exists({ siteId })) return { skipped: true };
  const site = await Site.findById(siteId).lean();
  const status = await SystemStatus.findById(siteId).lean();
  const start = new Date(site.historyStartAt);
  const end = new Date(status.siteClock);
  const started = Date.now();
  let runs = 0;
  for (let t = addMinutes(start, 24 * 60); t < end; t = addMinutes(t, STEP_MIN)) {
    await runPipeline(siteId, t, { live: false });
    runs += 1;
  }
  await runPipeline(siteId, end, { live: true });
  logger.info(
    { siteId, runs: runs + 1, s: ((Date.now() - started) / 1000).toFixed(1) },
    'History backfilled',
  );
  return { runs: runs + 1 };
}
