import { logger } from '../../config/logger.js';
import { bus } from '../../realtime/bus.js';
import { runPipeline } from './runPipeline.js';

const EVERY_MIN = 10;

/**
 * Runs the pipeline after new readings arrive (simulator or gateway), at most once per
 * EVERY_MIN minutes of site time. Readings that arrive during a run are covered by a follow-up run.
 */
export function startPipelineScheduler() {
  const state = new Map(); // siteId -> { lastRun: Date, pending: Date|null, running: boolean }

  const run = async (siteId, now) => {
    const s = state.get(siteId);
    s.running = true;
    try {
      await runPipeline(siteId, now);
      s.lastRun = now;
    } catch (err) {
      logger.error({ err, siteId }, 'Pipeline run failed');
    } finally {
      s.running = false;
    }
    if (s.pending && s.pending - s.lastRun >= EVERY_MIN * 60000) {
      const next = s.pending;
      s.pending = null;
      await run(siteId, next);
    }
  };

  const onReadings = ({ siteId, siteNow }) => {
    const s = state.get(siteId) ?? { lastRun: new Date(0), pending: null, running: false };
    state.set(siteId, s);
    if (siteNow - s.lastRun < EVERY_MIN * 60000) return;
    if (s.running) {
      s.pending = siteNow;
      return;
    }
    run(siteId, siteNow);
  };

  bus.on('readings:accepted', onReadings);
  return { stop: () => bus.off('readings:accepted', onReadings) };
}
