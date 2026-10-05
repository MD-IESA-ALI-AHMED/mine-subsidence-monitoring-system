import { Server } from 'socket.io';
import { SOCKET_EVENTS, siteRoom } from '@subsidence/shared';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { bus } from './bus.js';
import { createThrottler } from './throttle.js';

export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: env.corsOrigins, credentials: true },
  });
  io.on('connection', (socket) => {
    socket.join(siteRoom(env.DEFAULT_SITE_ID));
    socket.on(SOCKET_EVENTS.JOIN_SITE, (siteId) => {
      if (typeof siteId !== 'string' || siteId.length > 40) return;
      for (const room of socket.rooms) if (room.startsWith('site:')) socket.leave(room);
      socket.join(siteRoom(siteId));
    });
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
