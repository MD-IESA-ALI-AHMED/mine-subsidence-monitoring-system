import { formatTime } from '../../utils/time.js';

const MIN = 60_000;
const STALE_INTERVALS = 3;
const REPORT_INTERVAL_MIN = 10;

/**
 * The status strip as a list of { key, text, level, title } with level ok | warning | critical.
 * Pure, so it can be tested without rendering.
 */
export function statusItems({ status, siteNow, conn, lastMessageWall, lastReadingSite, wallNow }) {
  if (!status) return [{ key: 'loading', text: 'Connecting…', level: 'ok' }];
  const items = [];

  const share = status.meshTotal ? status.meshOnline / status.meshTotal : 1;
  items.push({
    key: 'mesh',
    text: `mesh ${status.meshOnline}/${status.meshTotal}`,
    level: share < 0.8 ? 'critical' : share < 0.95 ? 'warning' : 'ok',
    title: 'Units reporting / all units',
  });

  if (status.degraded) {
    const since = status.degradedSince ? ` ${formatTime(status.degradedSince)}` : '';
    items.push({
      key: 'degraded',
      text: `Degraded — root lost${since}, ${status.rootId} now root`,
      level: 'warning',
    });
  } else {
    items.push({ key: 'root', text: `root ${status.rootId ?? '—'}`, level: 'ok' });
  }

  const model = status.model ?? {};
  if (model.reachable === false) {
    const from = model.lastGoodAt ? ` — showing forecast from ${formatTime(model.lastGoodAt)}` : '';
    items.push({
      key: 'model',
      text: `Model unreachable${from}`,
      level: 'warning',
      title: model.lastError,
    });
  } else {
    items.push({
      key: 'model',
      text: `model ${model.mode ?? '—'}`,
      level: 'ok',
      title: model.modelVersion,
    });
  }

  // The status document updates every pipeline run; readings pushed since then count too.
  const statusMs = status.lastReadingAt ? new Date(status.lastReadingAt).getTime() : 0;
  const newestMs = Math.max(statusMs, lastReadingSite ?? 0);
  const lastReading = newestMs ? new Date(newestMs) : null;
  const ageSiteMin = lastReading ? (siteNow - lastReading) / MIN : Infinity;
  if (ageSiteMin > STALE_INTERVALS * REPORT_INTERVAL_MIN) {
    const text = lastReading ? `No new data for ${Math.round(ageSiteMin)} min` : 'No data yet';
    items.push({ key: 'data', text, level: 'warning' });
  } else {
    const wallAge = lastMessageWall
      ? Math.max(0, Math.round((wallNow - lastMessageWall) / 1000))
      : null;
    const text =
      wallAge == null
        ? `data ${formatTime(lastReading)}`
        : wallAge < 90
          ? `data ${wallAge} s ago`
          : `data ${Math.round(wallAge / 60)} min ago`;
    items.push({ key: 'data', text, level: 'ok', title: 'Time since the last readings arrived' });
  }

  if (conn === 'reconnecting' || conn === 'offline') {
    items.push({
      key: 'socket',
      text: conn === 'offline' ? 'Offline' : 'Reconnecting…',
      level: 'warning',
    });
  }
  if (status.simulated) items.push({ key: 'sim', text: 'Simulated data', level: 'muted' });
  return items;
}
