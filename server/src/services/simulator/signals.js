import { dist } from '../field/geometry.js';
import { rssiAt } from '../topology/meshTree.js';
import { gaussian, makeRng } from './rng.js';

// Environmental and electrical signals. t is the simulated minute; history starts at IST midnight,
// so (t mod 1440) is the IST time of day.

const hourOf = (t) => (((t % 1440) + 1440) % 1440) / 60;

/** Smooth day-to-day offset: interpolates seeded per-day values with a cosine. */
function dayOffset(seed, key, t, amp) {
  const d = t / 1440;
  const d0 = Math.floor(d);
  const v = (day) => (makeRng(seed, key, day)() * 2 - 1) * amp;
  const f = (1 - Math.cos(Math.PI * (d - d0))) / 2;
  return v(d0) * (1 - f) + v(d0 + 1) * f;
}

/** Box temperature: daily cycle between tempMin and tempMax, peaking mid-afternoon. */
export function temperature(ctx, node, t, rng) {
  const s = ctx.cfg.signals;
  const mid = (s.tempMin_C + s.tempMax_C) / 2;
  const amp = (s.tempMax_C - s.tempMin_C) / 2 - s.tempDayVariation_C;
  const cycle = Math.cos((2 * Math.PI * (hourOf(t) - s.tempPeakHour)) / 24);
  return (
    mid +
    amp * cycle +
    dayOffset(ctx.cfg.seed, 'temp', t, s.tempDayVariation_C) +
    ctx.statics.get(node._id).tempOffset +
    (rng ? gaussian(rng) * 0.15 : 0)
  );
}

/** Thermal lean of the tilt sensor, lagging the box temperature. Returns [x, y] in µrad. */
export function thermalLean(ctx, node, t) {
  const s = ctx.cfg.signals;
  const mid = (s.tempMin_C + s.tempMax_C) / 2;
  const half = (s.tempMax_C - s.tempMin_C) / 2;
  const k = (temperature(ctx, node, t - s.thermalLag_min) - mid) / half;
  const az = (node.azimuth_deg * Math.PI) / 180;
  return [s.thermalLean_urad * k * Math.cos(az), s.thermalLean_urad * k * Math.sin(az)];
}

export function pressure(ctx, node, t, rng) {
  const p = ctx.cfg.signals.pressure;
  const base = p.sea_Pa * (1 - 2.25577e-5 * node.z_ground) ** 5.25588;
  const days = t / 1440;
  const tide = p.tide_Pa * Math.sin((4 * Math.PI * hourOf(t)) / 24);
  const drift = p.drift_Pa * Math.sin((2 * Math.PI * days) / 4.3 + 0.7);
  return base + tide + drift + gaussian(rng) * 3;
}

/** Sensor battery: slow discharge, a few mV of temperature swing. Null once below cutoff. */
export function sensorBattery(ctx, node, t, rng) {
  const st = ctx.statics.get(node._id);
  const days = t / 1440;
  const H = ctx.cfg.scenarios.H_lowBattery;
  const low = node._id === ctx.lowBatteryNodeId;
  const start = low ? H.start_mV : st.batteryStart;
  const drain = low ? H.drain_mVPerDay : st.batteryDrain;
  const temp = temperature(ctx, node, t) - 35;
  return start - drain * days + temp * 0.6 + gaussian(rng) * 2;
}

/** Relay battery and solar panel voltage: charge by day, discharge by night. */
export function relayPower(ctx, node, t, rng) {
  const b = ctx.cfg.signals.relayBattery;
  const h = hourOf(t);
  const daylight = h > b.sunrise_h && h < b.sunset_h;
  const cloud = 0.75 + 0.25 * makeRng(ctx.cfg.seed, 'cloud', Math.floor(t / 1440))();
  const sun = daylight ? Math.sin((Math.PI * (h - b.sunrise_h)) / (b.sunset_h - b.sunrise_h)) : 0;
  const solar = b.solarPeak_mV * sun * cloud;
  const soc = 0.6 + 0.3 * Math.sin((2 * Math.PI * (h - 10)) / 24) * cloud;
  const battery = b.min_mV + (b.max_mV - b.min_mV) * soc + gaussian(rng) * 3;
  return { battery, solar: daylight ? solar + gaussian(rng) * 40 : 0 };
}

/** RSSI of the node's uplink at time t (sensor -> relay, relay -> mesh parent, root -> site computer). */
export function uplinkRssi(ctx, node, t, rng) {
  const mesh = ctx.meshAt(t);
  let target;
  if (node.type === 'relay' || node.type === 'root') {
    const parentId = mesh.tree.get(node._id)?.parentId;
    target = parentId ? ctx.nodes.get(parentId) : ctx.cfg.site.controlRoom;
  } else {
    const relayId = mesh.down.has(node.parentRelayId) ? node.backupRelayId : node.parentRelayId;
    target = ctx.nodes.get(relayId);
  }
  const d = dist(node.x, node.y, target.x, target.y);
  return rssiAt(d, ctx.cfg.signals.rssi) + gaussian(rng) * ctx.cfg.signals.rssi.noise_dB;
}
