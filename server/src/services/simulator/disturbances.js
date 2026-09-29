import { dist } from '../field/geometry.js';
import { makeRng, uniform } from './rng.js';

// Scenario D (daily blasts), E (seating shift) and F (haul truck transients).

export const blastTime = (ctx, day) => day * 1440 + ctx.cfg.scenarios.D_dailyBlasts.time_h * 60;

/** Ground motion at a node from a blast inside (t − window, t], or null. */
export function blastAt(ctx, node, t, window) {
  const D = ctx.cfg.scenarios.D_dailyBlasts;
  const tb = blastTime(ctx, Math.floor(t / 1440));
  if (!(tb > t - window && tb <= t)) return null;
  const d = Math.max(10, dist(node.x, node.y, D.source[0], D.source[1]));
  const ppv = D.K * (d / Math.sqrt(D.charge_kg)) ** -D.beta;
  const pga = (ppv * 2 * Math.PI * D.fDom_Hz) / 9.81;
  return { ppv, pga, fDom: D.fDom_Hz, t: tb };
}

export function seatingStep(ctx, node, t) {
  const E = ctx.cfg.scenarios.E_seatingShift;
  return node._id === E.nodeId && t >= blastTime(ctx, E.blastDay) ? E.tiltStepX_urad : 0;
}

export function roadY(ctx, x) {
  const r = ctx.cfg.site.haulRoads[0];
  return r.y_m + r.amplitude_m * Math.sin(x / r.wave_m);
}

export function nearRoad(ctx, node) {
  return Math.abs(node.y - roadY(ctx, node.x)) <= ctx.cfg.scenarios.F_haulTrucks.withinRoad_m;
}

/** Truck passes for one day, each with its start minute (day-relative), direction and size. */
export function truckPasses(ctx, day) {
  if (ctx.truckMemo.has(day)) return ctx.truckMemo.get(day);
  const F = ctx.cfg.scenarios.F_haulTrucks;
  const rng = makeRng(ctx.cfg.seed, 'truck', day);
  const passes = [];
  for (let k = 0; ; k += 1) {
    const start = F.startHour * 60 + k * F.everyMinutes + (rng() * 2 - 1) * F.jitterMinutes;
    if (start >= F.endHour * 60) break;
    passes.push({
      id: `${day}-${k}`,
      start: day * 1440 + Math.max(F.startHour * 60, start),
      eastbound: k % 2 === 0,
      duration: uniform(rng, F.duration_min),
      tilt: uniform(rng, F.tiltSpike_urad),
      pga: uniform(rng, F.pga_mg),
    });
  }
  ctx.truckMemo.set(day, passes);
  return passes;
}

/** Minute the truck of `pass` is level with the node. */
export function passTime(ctx, pass, node) {
  const { xMax } = ctx.cfg.site.extent;
  const along = pass.eastbound ? node.x : xMax - node.x;
  return pass.start + along / ctx.cfg.scenarios.F_haulTrucks.speed_mPerMin;
}

/** Tilt spike from a truck at time t, decaying over the pass duration, or null. */
export function truckAt(ctx, node, t) {
  if (!nearRoad(ctx, node)) return null;
  const day = Math.floor(t / 1440);
  for (const pass of truckPasses(ctx, day)) {
    const tp = passTime(ctx, pass, node);
    if (t >= tp && t < tp + pass.duration) {
      const decay = 1 - (t - tp) / pass.duration;
      const side = node.y > roadY(ctx, node.x) ? -1 : 1; // leans toward the road
      return { tiltY: side * pass.tilt * decay, pga: pass.pga * decay, passId: pass.id, t: tp };
    }
  }
  return null;
}
