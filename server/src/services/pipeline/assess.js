import { TIER_LABELS, tierRank } from '@subsidence/shared';
import { inverseVelocity } from '../inverseVelocity/inverseVelocity.js';
import { combineTCrit, scoreZone } from '../severity/severity.js';
import { modelTCrit } from './predict.js';

/** Mean hourly excess speed across a zone's nodes, for the zone's inverse-velocity fit. */
function zoneSpeedSeries(zone, metrics) {
  const byHour = new Map();
  for (const id of zone.nodeIds) {
    for (const p of metrics.get(id)?.speedSeries ?? []) {
      const acc = byHour.get(p.tHours) ?? [];
      acc.push(p.speed_mmPerDay);
      byHour.set(p.tHours, acc);
    }
  }
  return [...byHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tHours, vs]) => ({ tHours, speed_mmPerDay: vs.reduce((a, b) => a + b, 0) / vs.length }));
}

const fmt = (v, d = 0) => (v == null ? '—' : Number(v).toFixed(d));

/** One plain-words line explaining the tier. */
export function reasonFor(z) {
  const bits = [];
  if (z.peakExcess_mm >= 5) bits.push(`${fmt(z.peakExcess_mm)} mm more sinking than expected`);
  else bits.push(`peak sinking ${fmt(z.peakSinking_mm)} mm, as expected`);
  if (z.maxSpeed_mmPerDay >= 1) bits.push(`speed ${fmt(z.maxSpeed_mmPerDay, 1)} mm/day`);
  if (z.accelerating) bits.push('speeding up');
  if (z.hasSilentAfterRise) bits.push('a node went silent while rising');
  if (z.tCrit.used_h != null) bits.push(`limit in ${fmt(z.tCrit.used_h)} h`);
  return `${bits.join(', ')}.`.replace(/^./, (c) => c.toUpperCase());
}

/** Inverse velocity, time to limit and severity for each zone. */
export function assessZones({ zones, metrics, thresholds, prediction, now }) {
  return zones.map((zone) => {
    const iv = inverseVelocity(zoneSpeedSeries(zone, metrics), {
      minSpeed_mmPerDay: thresholds.gateOffSpeed_mmPerDay,
    });
    // Inverse velocity only means something while the zone is actually speeding up.
    const ivT = zone.accelerating || zone.hasSilentAfterRise ? iv.tCrit_h : null;
    const model_h = modelTCrit(prediction, zone, now);
    const tCrit = { model_h, inverseVelocity_h: ivT, ...combineTCrit(model_h, ivT) };
    const severity = scoreZone({ ...zone, tCritUsed_h: tCrit.used_h }, thresholds);
    return {
      ...zone,
      tCrit,
      severity,
      inverseVelocity: {
        points: iv.points.map(([t, v]) => [t, +v.toFixed(4)]),
        slope: iv.slope,
        intercept: iv.intercept,
      },
    };
  });
}

/** Alerts to raise: zones whose tier rose since the previous run (or new zones at watch or above). */
export function risenTiers(assessed, prevZones) {
  const prevTier = new Map(prevZones.map((z) => [z.zoneKey, z.severity?.tier ?? 'normal']));
  return assessed
    .filter((z) => tierRank(z.severity.tier) > tierRank(prevTier.get(z.zoneKey) ?? 'normal'))
    .filter((z) => tierRank(z.severity.tier) >= tierRank('watch'))
    .map((z) => ({
      zoneKey: z.zoneKey,
      nodeIds: z.nodeIds,
      tier: z.severity.tier,
      title: `${z.zoneKey} ${TIER_LABELS[z.severity.tier].toLowerCase()}`,
      reason: reasonFor(z),
    }));
}
