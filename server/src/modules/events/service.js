import { publish } from '../../realtime/bus.js';
import { SOCKET_EVENTS } from '@subsidence/shared';
import { Event } from './model.js';

export async function listEvents(siteId, { from, to, kind, limit = 2000 }) {
  const q = { siteId };
  if (from || to) q.ts = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (kind?.length) q.kind = { $in: kind };
  return Event.find(q).sort({ ts: -1 }).limit(limit).lean();
}

export async function addEvents(siteId, events) {
  if (!events.length) return;
  await Event.insertMany(
    events.map((e) => ({ ...e, siteId })),
    { ordered: false },
  ).catch((err) => {
    if (err.code !== 11000) throw err; // replays of the same event are ignored
  });
  for (const e of events) {
    if (e.kind !== 'vehicle_transient') publish(SOCKET_EVENTS.EVENT_NEW, siteId, { ...e, siteId });
  }
}
