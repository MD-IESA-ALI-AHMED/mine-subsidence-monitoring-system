import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@subsidence/shared';

/**
 * Opens the public Socket.IO connection. `onState` gets 'connected' | 'reconnecting' | 'offline'.
 */
export function connectSocket({ siteId, handlers, onState }) {
  const socket = io({
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: false,
  });
  let closed = false;

  socket.on('connect', () => {
    onState('connected');
    socket.emit(SOCKET_EVENTS.JOIN_SITE, siteId);
  });
  socket.on('disconnect', (reason) => {
    if (closed) return;
    if (reason === 'io server disconnect') socket.connect();
    else onState('reconnecting');
  });
  socket.on('connect_error', () => onState('reconnecting'));
  socket.io.on('reconnect_failed', () => onState('offline'));

  for (const [event, fn] of Object.entries(handlers)) socket.on(event, fn);
  socket.connect();

  return () => {
    closed = true;
    socket.removeAllListeners();
    socket.disconnect();
  };
}
