import { linearFit, quadraticFit, theilSen } from '../services/math/fit.js';

// Believable forecasts for the dummy scenarios, from the request series only.
// The mock forecasts the part the Knothe model does not explain (excess = sinking − expected),
// then adds back the expected trough, extrapolated from its own recent trend.

const TCRIT_STEP_H = 0.25;
const MAX_H = 72;
const SPEED_WINDOW = 6;

const valid = (xs, ys) => xs.map((x, i) => [x, ys[i]]).filter(([, y]) => y != null);

/** Excess speed (mm/day) per slot from a 6-slot straight-line fit. */
function excessSpeeds(times, excess) {
  return excess.map((_, i) => {
    if (i < SPEED_WINDOW - 1) return null;
    const pts = valid(
      times.slice(i - SPEED_WINDOW + 1, i + 1),
      excess.slice(i - SPEED_WINDOW + 1, i + 1),
    );
    if (pts.length < 4) return null;
    const fit = linearFit(
      pts.map((p) => p[0]),
      pts.map((p) => p[1]),
    );
    return fit ? fit.slope * 24 : null;
  });
}

/** Inverse-velocity failure time (hours from now) when the excess speed is rising. */
function failureTime(times, speeds) {
  const pts = valid(times, speeds).filter(([t, v]) => t >= -24 && v >= 1);
  if (pts.length < 24) return null;
  const fit = theilSen(
    pts.map((p) => p[0]),
    pts.map((p) => 1 / p[1]),
  );
  if (!fit || fit.slope >= 0 || fit.intercept <= 0) return null;
  const tf = -fit.intercept / fit.slope;
  return tf > 0 && tf < 400 ? { tf, m: fit.slope, b: fit.intercept } : null;
}

/** Excess forecast: steepening toward t_f when accelerating, otherwise a settling quadratic. */
function excessCurve(times, excess, e0, iv) {
  if (iv) {
    // 1/v = m·t + b  (v in mm/day, t in h)  =>  e(h) = e0 + ln((m·h + b)/b) / (24·m)
    const cap = 0.97 * iv.tf;
    return (h) => e0 + Math.log((iv.m * Math.min(h, cap) + iv.b) / iv.b) / (24 * iv.m);
  }
  const pts = valid(times, excess);
  const q =
    pts.length >= 12
      ? quadraticFit(
          pts.map((p) => p[0]),
          pts.map((p) => p[1]),
        )
      : null;
  if (!q) return () => e0;
  const vertex = q.c < 0 ? -q.b / (2 * q.c) : Infinity;
  const slopeNow = q.b; // derivative at h = 0
  return (h) => {
    const x = Math.min(h, Math.max(0, vertex));
    return Math.max(e0 - 0.5, e0 + slopeNow * x + q.c * x * x);
  };
}

/** Expected trough: grows at its last-6-hour rate, never shrinks. */
function expectedCurve(times, expected) {
  const pts = valid(times, expected).filter(([t]) => t >= -6);
  const x0 = pts.at(-1)?.[1] ?? 0;
  const fit =
    pts.length >= 4
      ? linearFit(
          pts.map((p) => p[0]),
          pts.map((p) => p[1]),
        )
      : null;
  const rate = Math.max(0, fit?.slope ?? 0);
  return (h) => x0 + rate * h;
}

const halfBand = (p50, s0, h) => (0.5 + 0.15 * Math.abs(p50 - s0)) * Math.sqrt(h / 6);

export function forecastNode(node, request) {
  const { stepMinutes } = request.window;
  const s = node.series;
  let last = s.sinking_mm.length - 1;
  while (last >= 0 && s.sinking_mm[last] == null) last -= 1;
  const times = s.sinking_mm.map((_, i) => ((i - last) * stepMinutes) / 60);
  const expected = s.expected_mm ?? s.sinking_mm.map(() => node.static.knotheExpected_mm ?? 0);
  const excess = s.sinking_mm.map((v, i) => (v == null ? null : v - (expected[i] ?? 0)));
  const s0 = last >= 0 ? s.sinking_mm[last] : 0;
  const e0 = last >= 0 ? excess[last] : 0;

  const iv = failureTime(times, excessSpeeds(times, excess));
  const eCurve = excessCurve(times, excess, e0, iv);
  const xCurve = expectedCurve(times, expected);
  const p50 = (h) => xCurve(h) + eCurve(h);
  const horizons = request.horizonsHours.map((h) => {
    const mid = p50(h);
    const band = halfBand(mid, s0, h);
    return {
      h,
      p10_mm: +(mid - band).toFixed(2),
      p50_mm: +mid.toFixed(2),
      p90_mm: +(mid + band).toFixed(2),
    };
  });

  // Time until the cautious (p10) unexplained sinking reaches the limit.
  let tCrit = e0 >= request.limits.sinking_mm ? 0 : null; // already past the limit
  for (let h = TCRIT_STEP_H; tCrit == null && h <= MAX_H; h += TCRIT_STEP_H) {
    const band = halfBand(p50(h), s0, h);
    if (eCurve(h) - band >= request.limits.sinking_mm) {
      tCrit = h;
      break;
    }
  }

  const speeds = s.speed_mmPerDay.filter((v) => v != null);
  const tilt = (i) => Math.hypot(s.tiltX_urad[i] ?? 0, s.tiltY_urad[i] ?? 0);
  const first = s.tiltX_urad.findIndex((v) => v != null);
  const strain = last > first && first >= 0 ? (tilt(last) - tilt(first)) / 1e6 : null;

  return {
    nodeId: node.nodeId,
    horizons,
    speed_mmPerDay: speeds.length ? +speeds.at(-1).toFixed(2) : null,
    strainRate_perDay: strain == null ? null : +strain.toExponential(3),
    tCrit_h: tCrit,
    _validFraction: s.mask.filter((m) => m === 0).length / s.mask.length,
    _accelerating: Boolean(iv),
  };
}

export function forecastZones(request, nodeResults) {
  const byId = new Map(nodeResults.map((r) => [r.nodeId, r]));
  return request.zones.map((z) => {
    const rs = z.nodeIds.map((id) => byId.get(id)).filter(Boolean);
    const tcs = rs.map((r) => r.tCrit_h).filter((v) => v != null);
    const validShare = rs.length ? rs.reduce((a, r) => a + r._validFraction, 0) / rs.length : 0;
    const accel = rs.some((r) => r._accelerating) ? 0.1 : 0;
    return {
      zoneKey: z.zoneKey,
      tCrit_h: tcs.length ? Math.min(...tcs) : null,
      confidence: +Math.min(0.95, 0.35 + 0.4 * validShare + accel).toFixed(2),
    };
  });
}
