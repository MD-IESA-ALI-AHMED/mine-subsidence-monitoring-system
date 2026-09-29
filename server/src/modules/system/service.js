import { SOCKET_EVENTS } from '@subsidence/shared';
import { publish } from '../../realtime/bus.js';
import { SystemStatus } from './model.js';

export async function getStatus(siteId) {
  return SystemStatus.findById(siteId).lean();
}

/**
 * Merges changes into the status document and publishes it. `set` uses dotted paths
 * (e.g. { 'model.reachable': false }).
 */
export async function updateStatus(siteId, set) {
  const doc = await SystemStatus.findByIdAndUpdate(
    siteId,
    { $set: { ...set, updatedAt: new Date() } },
    { new: true, upsert: true, lean: true },
  );
  publish(SOCKET_EVENTS.SYSTEM_STATUS, siteId, doc);
  return doc;
}
