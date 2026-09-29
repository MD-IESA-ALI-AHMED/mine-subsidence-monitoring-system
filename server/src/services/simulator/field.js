import { dist } from '../field/geometry.js';
import { knotheSinking } from '../field/knothe.js';
import { smoothstep } from './rng.js';

// Noise-free sinking field (mm, positive down) for scenarios A, B and C.

const bump = (x, y, [cx, cy], r) => Math.exp(-((dist(x, y, cx, cy) / r) ** 4));

/**
 * Scenario C speed profile: speed = A / (t_f − t) after a smooth onset (inverse velocity falls
 * in a straight line toward t_f). Shortly before t_f the ground "lets go" and the speed decays.
 * Returns a sinking(days) function scaled so sinking at day 7 equals targetAtDay7_mm.
 */
export function buildCProfile(c) {
  const stepDays = 1 / 1440;
  const tc = c.failureDay - c.postFailureStart_h / 24;
  const rampDays = c.onsetRamp_h / 24;
  const unitSpeed = (d) => smoothstep((d - c.onsetDay) / rampDays) / (c.failureDay - d);
  const table = [0];
  for (let d = c.onsetDay; d < tc; d += stepDays) {
    table.push(table.at(-1) + unitSpeed(d + stepDays / 2) * stepDays);
  }
  const unitSink = (d) => {
    if (d <= c.onsetDay) return 0;
    if (d < tc) {
      const f = (d - c.onsetDay) / stepDays;
      const i = Math.floor(f);
      return table[i] + (table[Math.min(i + 1, table.length - 1)] - table[i]) * (f - i);
    }
    const vc = unitSpeed(tc);
    return (
      table.at(-1) + vc * c.postFailureTau_days * (1 - Math.exp(-(d - tc) / c.postFailureTau_days))
    );
  };
  const A = c.targetAtDay7_mm / unitSink(7);
  return {
    A,
    sinking: (d) => A * unitSink(d),
    speed: (d) =>
      A * (d < tc ? unitSpeed(d) : unitSpeed(tc) * Math.exp(-(d - tc) / c.postFailureTau_days)),
  };
}

/** Expected (Knothe) sinking of P1 at simulated minute t. */
export function expectedSinking(ctx, x, y, t) {
  const days = (t - ctx.p1FaceOffsetMin) / 1440;
  return knotheSinking(ctx.p1Model, x, y, days);
}

/** Total noise-free sinking at a point. */
export function fieldSinking(ctx, x, y, t) {
  const days = t / 1440;
  const { B_excessSinking: B, C_acceleratingOldWorkings: C } = ctx.cfg.scenarios;
  let s = expectedSinking(ctx, x, y, t);

  if (days > B.fromDay) {
    const w = bump(x, y, B.centre, B.radius_m);
    if (w > 1e-4) {
      // 30 % more than Knothe from day 4, levelling off at maxExtra_mm (the weak ground settles).
      const grown = s - expectedSinking(ctx, x, y, B.fromDay * 1440);
      const raw = B.extraFraction * Math.max(0, grown);
      const extra = B.maxExtra_mm * Math.tanh(raw / B.maxExtra_mm);
      s += w * extra * smoothstep((days - B.fromDay) / B.rampDays);
    }
  }
  if (days > C.onsetDay) {
    const w = bump(x, y, C.centre, C.radius_m);
    if (w > 1e-4) s += w * ctx.cProfile.sinking(days);
  }
  return s;
}
