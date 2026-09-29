import { theilSen } from '../math/fit.js';

const MIN_POINTS = 12;

/**
 * Inverse-velocity (Fukuzono) estimate of failure time.
 * When ground speeds up before failing, 1/speed falls roughly in a straight line; where the line
 * reaches zero is the expected failure time.
 *
 * series: [{ tHours, speed_mmPerDay }] with tHours relative to now (<= 0), covering ~36 h.
 * Returns { tCrit_h, slope, intercept, points } — tCrit_h is null unless the fitted slope is
 * negative (speed rising) and the zero crossing is in the future.
 */
export function inverseVelocity(series, { minSpeed_mmPerDay = 1 } = {}) {
  const pts = series
    .filter((p) => p.speed_mmPerDay != null && p.speed_mmPerDay >= minSpeed_mmPerDay)
    .map((p) => [p.tHours, 1 / p.speed_mmPerDay]);
  if (pts.length < MIN_POINTS) return { tCrit_h: null, slope: null, intercept: null, points: pts };
  const fit = theilSen(
    pts.map((p) => p[0]),
    pts.map((p) => p[1]),
  );
  if (!fit || fit.slope >= 0 || fit.intercept <= 0) {
    return {
      tCrit_h: null,
      slope: fit?.slope ?? null,
      intercept: fit?.intercept ?? null,
      points: pts,
    };
  }
  const tCrit = -fit.intercept / fit.slope;
  return { tCrit_h: +tCrit.toFixed(1), slope: fit.slope, intercept: fit.intercept, points: pts };
}
