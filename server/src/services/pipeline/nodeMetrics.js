import { isGroundSensorType, isRelayType } from '@subsidence/shared';
import { expectedAt } from '../field/expected.js';
import { linearFit, quadraticFit } from '../math/fit.js';
import { classifyNode } from './nodeStatus.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const expectedCache = new Map();

function expectedCached(site, node, ts) {
  const key = `${site._id}|${node._id}|${ts.getTime()}`;
  let v = expectedCache.get(key);
  if (v === undefined) {
    if (expectedCache.size > 300_000) expectedCache.clear();
    v = expectedAt(site, node.x, node.y, ts);
    expectedCache.set(key, v);
  }
  return v;
}

/** Slope (mm/day) of excess over readings in [t0, t1]. */
function slopeIn(rows, t0, t1) {
  const w = rows.filter((r) => r.ts >= t0 && r.ts <= t1);
  if (w.length < 3) return null;
  const fit = linearFit(
    w.map((r) => (r.ts - t1) / DAY_MS),
    w.map((r) => r.excess),
  );
  return fit ? fit.slope : null;
}

function valueNear(rows, t, toleranceMs) {
  let best = null;
  for (const r of rows) {
    const d = Math.abs(r.ts - t);
    if (d <= toleranceMs && (!best || d < Math.abs(best.ts - t))) best = r;
  }
  return best;
}

/**
 * Everything the gate, zones and severity need for one node, from its last 36 h of readings.
 * Pure apart from a memo of Knothe values.
 */
export function nodeMetrics({ site, node, rows, now, excluded }) {
  const th = site.thresholds;
  const measuring = isGroundSensorType(node.type);
  const status =
    node.status === 'silent_after_rise' && (!node.lastSeenAt || rows.length === 0)
      ? 'silent_after_rise'
      : classifyNode({
          lastSeenAt: node.lastSeenAt,
          now,
          intervalMin: node.fastMode ? 1 : 10,
          recentSpeeds: rows
            .filter((r) => r.ts >= new Date(new Date(node.lastSeenAt) - 6 * HOUR_MS))
            .map((r) => ({ tMin: r.ts / 60000, speed: r.speed_mmPerDay })),
          thresholds: th,
        });
  const base = { id: node._id, type: node.type, x: node.x, y: node.y, measuring, status, excluded };
  if (isRelayType(node.type) || !rows.length) return { ...base, rows: [] };

  const withExcess = rows
    .filter((r) => r.sinking_mm != null)
    .map((r) => ({ ts: r.ts, sinking: r.sinking_mm, speed: r.speed_mmPerDay, excess: 0 }));
  for (const r of withExcess) r.excess = r.sinking - expectedCached(site, node, r.ts);
  const last = withExcess.at(-1);
  if (!last) return { ...base, rows: [] };

  const dayAgo =
    valueNear(withExcess, last.ts - DAY_MS, 40 * 60000) ??
    (last.ts - withExcess[0].ts >= 12 * HOUR_MS ? withExcess[0] : null);
  const lastHour = slopeIn(withExcess, new Date(last.ts - HOUR_MS), last.ts);
  const sixHours = withExcess.filter((r) => r.ts >= last.ts - 6 * HOUR_MS);
  const quad =
    sixHours.length >= 12
      ? quadraticFit(
          sixHours.map((r) => (r.ts - last.ts) / DAY_MS),
          sixHours.map((r) => r.excess),
        )
      : null;

  // Hourly excess speeds over the last 36 h, for the inverse-velocity fit.
  const speedSeries = [];
  for (let h = 35; h >= 0; h -= 1) {
    const t1 = new Date(now.getTime() - h * HOUR_MS);
    const s = slopeIn(withExcess, new Date(t1 - HOUR_MS), t1);
    if (s != null) speedSeries.push({ tHours: -h, speed_mmPerDay: s });
  }

  return {
    ...base,
    lastTs: last.ts,
    sinking_mm: last.sinking,
    expected_mm: last.sinking - last.excess,
    excess_mm: last.excess,
    change24h_mm: dayAgo ? last.sinking - dayAgo.sinking : null,
    excessChange24h_mm: dayAgo ? last.excess - dayAgo.excess : null,
    speed_mmPerDay: last.speed ?? null,
    excessSpeed_mmPerDay: lastHour,
    excessAccel_mmPerDay2: quad ? 2 * quad.c : null,
    speedSeries,
    rows,
  };
}
