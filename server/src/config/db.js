import mongoose from 'mongoose';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

const RETRY_MS = 3000;
const DEFAULT_DB = 'subsidence';

/** Host part of a connection string, without credentials, for logs. */
export const safeHost = (uri) => uri.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?([^/?]+).*$/, '$3');

/** True when the URI names no database (typical for Atlas), so MongoDB would use "test". */
const hasDbName = (uri) => /^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri);

/**
 * Connects, retrying while MongoDB is unreachable (a local mongod still starting, or an Atlas
 * cluster waking up). Uses the database named in the URI, or "subsidence" if it names none.
 */
export async function connectDb(uri, { retries = 30 } = {}) {
  const options = { serverSelectionTimeoutMS: 10_000, ...(hasDbName(uri) ? {} : { dbName: DEFAULT_DB }) };
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongoose.connect(uri, options);
      logger.info({ host: safeHost(uri), db: mongoose.connection.name }, 'MongoDB connected');
      return mongoose.connection;
    } catch (err) {
      if (attempt >= retries) throw err;
      logger.warn(
        { attempt, host: safeHost(uri), err: err.message },
        'MongoDB not reachable, retrying (on Atlas, check Network Access allows this server’s IP)',
      );
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
  }
}

export function dbState() {
  return mongoose.connection.readyState === 1 ? 'up' : 'down';
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
