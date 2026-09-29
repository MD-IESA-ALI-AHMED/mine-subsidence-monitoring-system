import { SOCKET_EVENTS as E } from '@subsidence/shared';

// Never more than 4 messages per second per event type and room (system:status: 1 per second).
// Events that carry lists are merged into one array per flush; state snapshots keep the latest.

const MERGE = new Set([E.READINGS_BATCH, E.NODE_STATUS, E.EVENT_NEW, E.ALERT_NEW, E.ALERT_UPDATED]);
const INTERVAL_MS = { [E.SYSTEM_STATUS]: 1000 };
const DEFAULT_MS = 250;

export function createThrottler(send) {
  const slots = new Map(); // `${room}|${event}` -> { timer, payload, lastSent }

  const flush = (key, room, event) => {
    const slot = slots.get(key);
    if (!slot || slot.payload === undefined) return;
    send(room, event, slot.payload);
    slot.payload = undefined;
    slot.lastSent = Date.now();
    slot.timer = null;
  };

  return {
    emit(room, event, payload) {
      const key = `${room}|${event}`;
      const slot = slots.get(key) ?? { timer: null, payload: undefined, lastSent: 0 };
      slots.set(key, slot);
      if (MERGE.has(event)) {
        const items = Array.isArray(payload) ? payload : [payload];
        slot.payload = (slot.payload ?? []).concat(items);
      } else {
        slot.payload = payload;
      }
      if (slot.timer) return;
      const interval = INTERVAL_MS[event] ?? DEFAULT_MS;
      const wait = Math.max(0, slot.lastSent + interval - Date.now());
      slot.timer = setTimeout(() => flush(key, room, event), wait);
    },
    stop() {
      for (const s of slots.values()) clearTimeout(s.timer);
      slots.clear();
    },
  };
}
