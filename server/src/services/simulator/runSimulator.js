import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { addEvents } from '../../modules/events/service.js';
import { Node } from '../../modules/nodes/model.js';
import { acceptReadings } from '../../modules/readings/accept.js';
import { Site } from '../../modules/sites/model.js';
import { SystemStatus } from '../../modules/system/model.js';
import { bus } from '../../realtime/bus.js';
import { readJson } from '../seed/dummyFiles.js';
import { setSiteNow } from '../time/siteClock.js';
import { addMinutes, minutesBetween } from '../time/siteTime.js';
import { buildContext, trimMemo } from './context.js';
import { readingAt } from './scenario.js';
import { eventsBetween } from './scenarioEvents.js';

/**
 * Replays the scripted scenarios as a live stream after the 7-day history, using the same
 * readingAt() as the generator, so the live data continues the same story. One tick is one
 * simulated minute; at SIM_SPEED=60 that is one real second. Nodes report every 10 minutes,
 * or every minute in fast mode.
 */
export async function startSimulator(siteId) {
  const cfg = readJson('scenarios.json');
  const [site, nodes, status] = await Promise.all([
    Site.findById(siteId).lean(),
    Node.find({ siteId }).lean(),
    SystemStatus.findById(siteId).lean(),
  ]);
  const ctx = buildContext(cfg, nodes);
  const start = new Date(site.historyStartAt);
  let t = Math.round(minutesBetween(start, new Date(status.siteClock))) + env.SIM_START_OFFSET_MIN;
  const fast = new Set(nodes.filter((n) => n.fastMode).map((n) => n._id));
  const onFast = ({ siteId: id, nodeIds }) => {
    if (id !== siteId) return;
    fast.clear();
    nodeIds.forEach((n) => fast.add(n));
  };
  bus.on('fastmode:changed', onFast);

  let busy = false;
  const tick = async () => {
    if (busy) return; // a slow tick never overlaps the next one
    busy = true;
    try {
      t += 1;
      const now = addMinutes(start, t);
      setSiteNow(siteId, now);
      const due = nodes.filter((n) => t % ctx.step === 0 || fast.has(n._id));
      const readings = [];
      for (const node of due) {
        const windowMin = fast.has(node._id) ? 1 : ctx.step;
        const r = readingAt(node, t, ctx, { windowMin, fastMode: fast.has(node._id) });
        if (!r) continue;
        const { tOffset_min: _t, ...fields } = r;
        readings.push({ ...fields, ts: now });
      }
      const events = eventsBetween(ctx, nodes, t - 1, t, (n) => (fast.has(n._id) ? 1 : ctx.step));
      if (events.length) {
        await addEvents(
          siteId,
          events.map(({ tOffset_min, ...e }) => ({ ...e, ts: addMinutes(start, tOffset_min) })),
        );
      }
      if (readings.length)
        await acceptReadings(siteId, readings, { source: 'simulator', siteNow: now });
      if (t % 60 === 0) {
        trimMemo(ctx);
        await SystemStatus.updateOne({ _id: siteId }, { $set: { siteClock: now } });
      }
    } catch (err) {
      logger.error({ err }, 'Simulator tick failed');
    } finally {
      busy = false;
    }
  };

  const periodMs = 60_000 / env.SIM_SPEED;
  const timer = setInterval(tick, periodMs);
  logger.info(
    { siteId, speed: env.SIM_SPEED, from: addMinutes(start, t).toISOString() },
    'Simulator running',
  );
  return {
    stop() {
      clearInterval(timer);
      bus.off('fastmode:changed', onFast);
    },
    tick,
  };
}
