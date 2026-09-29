import { SOCKET_EVENTS, batteryPct } from '@subsidence/shared';
import { bus, publish } from '../../realtime/bus.js';
import { Node } from '../nodes/model.js';
import { insertReadings } from './service.js';

/**
 * The single entry point for new readings, used by both the simulator and POST /ingest/frames:
 * store them, update each node's latest values, tell the clients, and trigger the pipeline.
 * readings: [{ nodeId, ts: Date, ...fields, flags }]
 */
export async function acceptReadings(siteId, readings, { source = 'ingest', siteNow } = {}) {
  if (!readings.length) return { stored: 0 };
  const known = new Set((await Node.find({ siteId }, { _id: 1 }).lean()).map((n) => n._id));
  const valid = readings.filter((r) => known.has(r.nodeId));
  await insertReadings(siteId, valid);

  const latest = new Map();
  for (const r of valid) {
    const prev = latest.get(r.nodeId);
    if (!prev || r.ts > prev.ts) latest.set(r.nodeId, r);
  }
  await Node.bulkWrite(
    [...latest.values()].map((r) => ({
      updateOne: {
        filter: { _id: r.nodeId, $or: [{ lastSeenAt: null }, { lastSeenAt: { $lt: r.ts } }] },
        update: {
          $set: {
            lastSeenAt: r.ts,
            ...(r.battery_mV != null && {
              battery: { mV: r.battery_mV, pct: batteryPct(r.battery_mV) },
            }),
            ...(r.rssi_dBm != null && { rssi_dBm: r.rssi_dBm }),
            ...(r.sinking_mm !== undefined && {
              latest: {
                sinking_mm: r.sinking_mm,
                speed_mmPerDay: r.speed_mmPerDay,
                accel_mmPerDay2: r.accel_mmPerDay2,
                tiltX_urad: r.tiltX_urad,
                tiltY_urad: r.tiltY_urad,
                temp_C: r.temp_C,
                rod_mm: r.rod_mm,
              },
            }),
          },
        },
      },
    })),
  );

  publish(
    SOCKET_EVENTS.READINGS_BATCH,
    siteId,
    valid.map((r) => ({
      nodeId: r.nodeId,
      ts: r.ts,
      sinking_mm: r.sinking_mm ?? null,
      speed_mmPerDay: r.speed_mmPerDay ?? null,
      tiltX_urad: r.tiltX_urad ?? null,
      tiltY_urad: r.tiltY_urad ?? null,
      battery_mV: r.battery_mV ?? null,
      rssi_dBm: r.rssi_dBm ?? null,
      flags: r.flags ?? {},
    })),
  );
  const newest = new Date(Math.max(...valid.map((r) => r.ts.getTime())));
  bus.emit('readings:accepted', { siteId, source, newest, siteNow: siteNow ?? newest });
  return { stored: valid.length, rejected: readings.length - valid.length };
}
