import http from 'node:http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';
import { bootstrap } from './bootstrap.js';
import { attachSocket } from './realtime/socket.js';

async function main() {
  await connectDb(env.MONGO_URI);
  const server = http.createServer(createApp());
  const realtime = attachSocket(server);
  await new Promise((resolve) => server.listen(env.PORT, resolve));
  logger.info({ port: env.PORT }, 'API listening');

  let background = {};
  bootstrap()
    .then((b) => {
      background = b;
    })
    .catch((err) => logger.error({ err }, 'Start-up tasks failed'));

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down');
    background.simulator?.stop();
    background.scheduler?.stop();
    realtime.close();
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Server failed to start');
  process.exit(1);
});
