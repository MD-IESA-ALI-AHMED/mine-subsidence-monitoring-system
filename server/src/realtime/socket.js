import { parse as parseCookie } from 'cookie';
import { Server } from 'socket.io';
import { SOCKET_EVENTS, siteRoom } from '@subsidence/shared';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ACCESS_COOKIE, verifyAccess } from '../modules/auth/tokens.js';
import { bus } from './bus.js';
import { createThrottler } from './throttle.js';

const EXPIRY_MARGIN_MS = 5000;

/** Authenticates the handshake from the access cookie; the client reconnects after a refresh. */
function authenticate(socket, next) {
  try {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
    const claims = verifyAccess(cookies[ACCESS_COOKIE] ?? '');
    socket.data.user = { id: claims.sub, name: claims.name };
    socket.data.exp = claims.exp * 1000;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: env.corsOrigins, credentials: true },
  });
  io.use(authenticate);

  io.on('connection', (socket) => {
    socket.join(siteRoom(env.DEFAULT_SITE_ID));
    socket.on(SOCKET_EVENTS.JOIN_SITE, (siteId) => {
      if (typeof siteId !== 'string' || siteId.length > 40) return;
      for (const room of socket.rooms) if (room.startsWith('site:')) socket.leave(room);
      socket.join(siteRoom(siteId));
    });
    // Disconnect when the access token expires; the client refreshes and reconnects.
    const untilExpiry = Math.max(1000, socket.data.exp - Date.now() - EXPIRY_MARGIN_MS);
    const timer = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.AUTH_EXPIRING);
      socket.disconnect(true);
    }, untilExpiry);
    socket.on('disconnect', () => clearTimeout(timer));
  });

  const throttler = createThrottler((room, event, payload) => io.to(room).emit(event, payload));
  const onPublish = ({ event, siteId, payload }) =>
    throttler.emit(siteRoom(siteId), event, payload);
  bus.on('publish', onPublish);

  logger.info('Socket.IO attached');
  return {
    io,
    close() {
      bus.off('publish', onPublish);
      throttler.stop();
      io.close();
    },
  };
}
