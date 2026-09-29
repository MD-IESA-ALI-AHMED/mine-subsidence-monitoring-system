import { EventEmitter } from 'node:events';

// In-process event bus. Services publish domain events here; realtime/socket.js forwards them to
// Socket.IO rooms. Keeps services free of any transport code.
export const bus = new EventEmitter();
bus.setMaxListeners(50);

/** publish(SOCKET_EVENTS.X, siteId, payload) */
export function publish(event, siteId, payload) {
  bus.emit('publish', { event, siteId, payload });
}
