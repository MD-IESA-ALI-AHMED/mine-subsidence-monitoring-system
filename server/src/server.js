import http from 'node:http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';
import { isEmpty, seedDatabase } from './services/seed/seedDatabase.js';

async function seedIfEmpty() {
  if (!(await isEmpty())) return;
  if (!env.DEMO_PASSWORD) {
    logger.warn('Database is empty and DEMO_PASSWORD is not set; run `npm run seed` first');
    return;
  }
  logger.info('Empty database: loading the dummy site');
  await seedDatabase({ demoPassword: env.DEMO_PASSWORD, log: (m) => logger.info(m) });
}

async function main() {
  await connectDb(env.MONGO_URI);
  await seedIfEmpty();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => logger.info({ port: env.PORT }, 'API listening'));

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down');
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
