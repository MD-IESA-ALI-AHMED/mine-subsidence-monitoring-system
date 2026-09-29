import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@subsidence/shared';
import { refreshSession } from './api.js';

/**
 * Socket.IO connection authenticated by the access cookie. The server disconnects when the token
 * expires; the client refreshes the session and reconnects. `onState` gets
 * 'connected' | 'reconnecting' | 'offline'.
 */
export function connectSocket({ siteId, handlers, onState, onAuthLost }) {
  const socket = io({
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket'],
    autoConnect: false,
  });
  let closed = false;

  const reconnectAfterRefresh = async () => {
    onState('reconnecting');
    try {
      await refreshSession();
      if (!closed) socket.connect();
    } catch {
      onAuthLost();
    }
  };

  socket.on('connect', () => {
    onState('connected');
    socket.emit(SOCKET_EVENTS.JOIN_SITE, siteId);
  });
  socket.on('disconnect', (reason) => {
    if (closed) return;
    // Server-side disconnect (token expiry) is not retried automatically by socket.io.
    if (reason === 'io server disconnect') reconnectAfterRefresh();
    else onState('reconnecting');
  });
  socket.on('connect_error', (err) => {
    if (err.message === 'unauthorized') reconnectAfterRefresh();
    else onState('reconnecting');
  });
  socket.io.on('reconnect_failed', () => onState('offline'));
  socket.on(SOCKET_EVENTS.AUTH_EXPIRING, () => refreshSession().catch(() => {}));

  for (const [event, fn] of Object.entries(handlers)) socket.on(event, fn);
  socket.connect();

  return () => {
    closed = true;
    socket.removeAllListeners();
    socket.disconnect();
  };
}
