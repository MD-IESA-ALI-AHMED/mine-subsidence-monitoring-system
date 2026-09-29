import { centroid, convexHull, distPolygonToPolyline, polygonArea } from '../field/geometry.js';
import { logFeature, stDbscan } from './stDbscan.js';
import { assignKeys } from './zoneKeys.js';

const MIN_AREA_PER_NODE_M2 = 100;

/** Candidate nodes for zones: ground sensors moving above the gate's closing level. */
export function zoneCandidates(metrics, thresholds) {
  return metrics.filter(
    (m) =>
      m.measuring &&
      !m.excluded &&
      m.status !== 'offline' &&
      (Math.abs(m.change24h_mm ?? 0) >= thresholds.gateOff_mm ||
        (m.speed_mmPerDay ?? 0) >= thresholds.gateOffSpeed_mmPerDay ||
        m.status === 'silent_after_rise'),
  );
}

/**
 * Speeding up: the unexplained speed grows by at least acceleratingMin mm/day² and by at least
 * acceleratingRelative_perDay of itself per day (so steady sinking at a high speed does not count).
 */
export function isAccelerating(accel, speed, t) {
  return (
    accel >= t.acceleratingMin_mmPerDay2 && accel >= t.acceleratingRelative_perDay * Math.abs(speed)
  );
}

function summarise(members, site, thresholds) {
  const pts = members.map((m) => [m.x, m.y]);
  const hull = convexHull(pts);
  const area = Math.max(
    hull.length >= 3 ? polygonArea(hull) : 0,
    members.length * MIN_AREA_PER_NODE_M2,
  );
  const byExcess = [...members].sort((a, b) => (b.excess_mm ?? 0) - (a.excess_mm ?? 0));
  const bySinking = [...members].sort((a, b) => (b.sinking_mm ?? 0) - (a.sinking_mm ?? 0));
  const peakExcess = byExcess[0].excess_mm ?? 0;
  const worst = peakExcess > 5 ? byExcess[0] : bySinking[0];
  const mean = (k) => members.reduce((s, m) => s + (m[k] ?? 0), 0) / members.length;
  const village = site.villageEdge?.polyline;
  return {
    nodeIds: members.map((m) => m.id).sort(),
    hull: hull.map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)]),
    area_m2: Math.round(area),
    centroid: centroid(pts).map((v) => +v.toFixed(1)),
    peakSinking_mm: +(bySinking[0].sinking_mm ?? 0).toFixed(2),
    peakExcess_mm: +peakExcess.toFixed(2),
    worstNodeId: worst.id,
    meanSpeed_mmPerDay: +mean('speed_mmPerDay').toFixed(2),
    meanExcessSpeed_mmPerDay: +mean('excessSpeed_mmPerDay').toFixed(2),
    maxSpeed_mmPerDay: +Math.max(...members.map((m) => m.speed_mmPerDay ?? 0)).toFixed(2),
    maxExcessSpeed_mmPerDay: +Math.max(...members.map((m) => m.excessSpeed_mmPerDay ?? 0)).toFixed(
      2,
    ),
    accelerating: isAccelerating(
      mean('excessAccel_mmPerDay2'),
      mean('excessSpeed_mmPerDay'),
      thresholds,
    ),
    knotheExpected_mm: +(worst.expected_mm ?? 0).toFixed(2),
    deviation_mm: +(worst.excess_mm ?? 0).toFixed(2),
    nearVillage:
      Boolean(village) &&
      distPolygonToPolyline(hull.length ? hull : pts, village) <= thresholds.severity.proximity_m,
    hasSilentAfterRise: members.some((m) => m.status === 'silent_after_rise'),
  };
}

/**
 * Finds moving zones with ST-DBSCAN on position and on how each node is moving beyond the
 * Knothe prediction (24 h change, speed, acceleration), then summarises each zone.
 */
export function buildZones({ metrics, site, prevZones = [], at }) {
  const t = site.thresholds;
  const sc = t.zoneFeatureScale;
  const points = zoneCandidates(metrics, t).map((m) => ({
    ...m,
    f: [
      logFeature(m.excessChange24h_mm, sc.change_mm),
      logFeature(m.excessSpeed_mmPerDay, sc.speed_mmPerDay),
      logFeature(m.excessAccel_mmPerDay2, sc.accel_mmPerDay2),
    ],
  }));
  const clusters = stDbscan(points, {
    eps1: t.neighbourRadius_m,
    eps2: t.zoneFeatureEps,
    minPts: t.minCorroborating,
  });
  const byId = new Map(points.map((p) => [p.id, p]));
  const drafts = clusters.map((ids) =>
    summarise(
      ids.map((id) => byId.get(id)),
      site,
      t,
    ),
  );
  const keys = assignKeys(drafts, prevZones, site, at);
  return drafts.map((d, i) => ({ zoneKey: keys[i], ...d }));
}
