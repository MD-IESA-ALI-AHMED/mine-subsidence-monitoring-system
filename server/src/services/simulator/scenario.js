import { isReferenceType, isRelayType } from '@subsidence/shared';
import { linearFit, quadraticFit } from '../math/fit.js';
import { blastAt, seatingStep, truckAt } from './disturbances.js';
import { fieldSinking } from './field.js';
import { gaussian, makeRng } from './rng.js';
import {
  pressure,
  relayPower,
  sensorBattery,
  temperature,
  thermalLean,
  uplinkRssi,
} from './signals.js';

const GRAD_H = 0.5;
const RESENT_MINUTES = 30;
const round = (v, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Measured sinking of a node (field + slow drift + white noise). Memoised: it is pure. */
function measuredSinking(ctx, node, t) {
  const key = `${node._id}|${t}`;
  const hit = ctx.memo.get(key);
  if (hit !== undefined) return hit;
  const sig = ctx.cfg.signals;
  const st = ctx.statics.get(node._id);
  let drift = 0;
  sig.sinkingDrift.forEach(({ amp_mm, period_h }, i) => {
    const w = (2 * Math.PI) / (period_h * 60);
    drift += amp_mm * (Math.sin(w * t + st.driftPhases[i]) - Math.sin(st.driftPhases[i]));
  });
  const white = gaussian(makeRng(ctx.cfg.seed, 's', node._id, t)) * sig.sinkingWhiteNoise_mm;
  const field = isReferenceType(node.type) ? 0 : fieldSinking(ctx, node.x, node.y, t);
  const v = field + (isReferenceType(node.type) ? drift * 0.5 : drift) + white;
  ctx.memo.set(key, v);
  return v;
}

/** Speed (mm/day) from a straight-line fit over the last N readings at the standard step. */
function speedAt(ctx, node, t) {
  const n = ctx.cfg.signals.speedWindowReadings;
  const xs = [];
  const ys = [];
  for (let k = n - 1; k >= 0; k -= 1) {
    xs.push(-k * ctx.step);
    ys.push(measuredSinking(ctx, node, t - k * ctx.step));
  }
  return linearFit(xs, ys).slope * 1440;
}

/**
 * Acceleration (mm/day²) from a quadratic fit over a longer window: a 6-reading window is too
 * short to separate curvature from sensor noise.
 */
function accelAt(ctx, node, t) {
  const n = ctx.cfg.signals.accelWindowReadings;
  const xs = [];
  const ys = [];
  for (let k = n - 1; k >= 0; k -= 1) {
    xs.push((-k * ctx.step) / 1440);
    ys.push(measuredSinking(ctx, node, t - k * ctx.step));
  }
  return 2 * quadraticFit(xs, ys).c;
}

/** Ground slope in µrad (1 mm/m = 1000 µrad), positive toward increasing sinking. */
function slopeAt(ctx, node, t) {
  if (isReferenceType(node.type)) return [0, 0];
  const f = (x, y) => fieldSinking(ctx, x, y, t);
  const gx = (f(node.x + GRAD_H, node.y) - f(node.x - GRAD_H, node.y)) / (2 * GRAD_H);
  const gy = (f(node.x, node.y + GRAD_H) - f(node.x, node.y - GRAD_H)) / (2 * GRAD_H);
  return [gx * 1000, gy * 1000];
}

function isSilent(ctx, node, t) {
  const sc = ctx.cfg.scenarios;
  if (node._id === ctx.silentNodeId && t >= sc.G_silentAfterRise.silentFromDay * 1440) return true;
  const { from, to, failedRoot } = ctx.rootFailure;
  return node._id === failedRoot && t >= from && t < to;
}

function baseFlags(ctx, t, opts) {
  const { from, to } = ctx.rootFailure;
  return {
    shaken: false,
    eventInWindow: false,
    lowBattery: false,
    rodInvalid: false,
    fastMode: Boolean(opts.fastMode),
    resent: t >= from && t < Math.min(to, from + RESENT_MINUTES),
    masked: false,
  };
}

function relayReading(ctx, node, t, rng, opts) {
  const power = relayPower(ctx, node, t, rng);
  return {
    battery_mV: Math.round(power.battery),
    solar_mV: Math.round(power.solar),
    rssi_dBm: round(uplinkRssi(ctx, node, t, rng), 1),
    temp_C: round(temperature(ctx, node, t, rng), 1),
    flags: baseFlags(ctx, t, opts),
  };
}

/**
 * One reading for `node` at simulated minute `t`, or null when the node does not report.
 * Pure: the same (node, t, ctx) always gives the same reading.
 * opts.windowMin is the reporting interval (10, or 1 in fast mode); opts.fastMode sets the flag.
 */
export function readingAt(node, t, ctx, opts = {}) {
  const windowMin = opts.windowMin ?? ctx.step;
  if (isSilent(ctx, node, t)) return null;
  const rng = makeRng(ctx.cfg.seed, 'r', node._id, t);
  const base = { nodeId: node._id, tOffset_min: t, seq: t % 65536 };
  if (isRelayType(node.type)) return { ...base, ...relayReading(ctx, node, t, rng, opts) };

  const battery = sensorBattery(ctx, node, t, rng);
  const H = ctx.cfg.scenarios.H_lowBattery;
  if (node._id === ctx.lowBatteryNodeId && battery < H.cutoff_mV) return null;

  const flags = baseFlags(ctx, t, opts);
  const sig = ctx.cfg.signals;
  const sinking = measuredSinking(ctx, node, t);
  const [slopeX, slopeY] = slopeAt(ctx, node, t);
  const [leanX, leanY] = thermalLean(ctx, node, t);
  let tiltX = slopeX + leanX + seatingStep(ctx, node, t) + gaussian(rng) * sig.tiltNoise_urad;
  let tiltY = slopeY + leanY + gaussian(rng) * sig.tiltNoise_urad;
  let pga = Math.abs(gaussian(rng)) * 0.4;
  let ppv = Math.abs(gaussian(rng)) * 0.01;
  let fDom = null;

  const blast = blastAt(ctx, node, t, windowMin);
  if (blast && blast.ppv >= ctx.cfg.scenarios.D_dailyBlasts.minPpv_mmps) {
    ({ ppv, pga, fDom } = blast);
    flags.eventInWindow = true;
  }
  const truck = truckAt(ctx, node, t);
  if (truck) {
    tiltY += truck.tiltY;
    pga = Math.max(pga, truck.pga);
    ppv = Math.max(ppv, truck.pga / 9);
    fDom = fDom ?? 8;
    flags.eventInWindow = true;
  }
  flags.shaken = pga > 20;
  flags.lowBattery = battery < 3300;

  return {
    ...base,
    tiltX_urad: round(tiltX, 1),
    tiltY_urad: round(tiltY, 1),
    tiltSigma_urad: sig.tiltNoise_urad,
    sinking_mm: round(sinking, 3),
    sinkingSigma_mm: sig.sinkingSigma_mm,
    speed_mmPerDay: round(speedAt(ctx, node, t), 3),
    accel_mmPerDay2: round(accelAt(ctx, node, t), 3),
    rod_mm: node.hasRod ? round(sinking * sig.rodAnchorRatio + gaussian(rng) * 0.1, 2) : null,
    pressure_Pa: round(pressure(ctx, node, t, rng), 0),
    temp_C: round(temperature(ctx, node, t, rng), 1),
    pga_mg: round(pga, 2),
    ppv_mmps: round(ppv, 3),
    fDom_Hz: fDom,
    battery_mV: Math.round(battery),
    solar_mV: null,
    rssi_dBm: round(uplinkRssi(ctx, node, t, rng), 1),
    flags,
  };
}
