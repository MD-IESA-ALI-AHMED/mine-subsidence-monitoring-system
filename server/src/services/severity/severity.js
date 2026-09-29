import { maxTier, tierFromScore } from '@subsidence/shared';

const f = (v) => Math.max(0, Math.min(1, v ?? 0));

/**
 * Danger score 0–100 and tier for one zone. Pure.
 *
 * Sinking, acceleration and deviation are scored on the part the Knothe model does not explain
 * (excess over the expected trough), so a normal longwall trough is not an alarm by itself.
 * Speed is scored on the measured value: fast ground damages surface structures whatever the
 * cause, which is why an active longwall trough sits at "watch".
 *
 * zone: { peakExcess_mm, maxSpeed_mmPerDay, accelerating, area_m2, deviation_mm,
 *         nearVillage, hasSilentAfterRise, tCritUsed_h }
 */
export function scoreZone(zone, thresholds) {
  const s = thresholds.severity;
  const w = s.weights;
  const parts = {
    sinking: w.sinking * f(zone.peakExcess_mm / thresholds.limitSinking_mm),
    speed: w.speed * f(zone.maxSpeed_mmPerDay / thresholds.limitSpeed_mmPerDay),
    accel: w.accel * (zone.accelerating ? 1 : 0),
    extent: w.extent * f(zone.area_m2 / s.extentRef_m2),
    deviation: w.deviation * f(Math.abs(zone.deviation_mm ?? 0) / s.deviationRef_mm),
    proximity: w.proximity * (zone.nearVillage ? 1 : 0),
  };
  for (const k of Object.keys(parts)) parts[k] = +parts[k].toFixed(1);
  const score = +Object.values(parts)
    .reduce((a, b) => a + b, 0)
    .toFixed(1);

  let tier = tierFromScore(score, s.tierCutoffs);
  const overrides = [];
  if (zone.tCritUsed_h != null && zone.tCritUsed_h < s.criticalBelow_h) {
    tier = 'critical';
    overrides.push(`limit in under ${s.criticalBelow_h} h`);
  }
  if (zone.hasSilentAfterRise) {
    const raised = maxTier(tier, 'warning');
    if (raised !== tier) overrides.push('node silent after rising');
    tier = raised;
  }
  return { score, tier, parts, overrides };
}

/** min of the non-null estimates, and which one it came from. */
export function combineTCrit(model_h, inverseVelocity_h) {
  const opts = [
    ['model', model_h],
    ['inverse_velocity', inverseVelocity_h],
  ].filter(([, v]) => v != null);
  if (!opts.length) return { used_h: null, method: null };
  const [method, used_h] = opts.reduce((a, b) => (b[1] < a[1] ? b : a));
  return { used_h: +used_h.toFixed(1), method };
}
