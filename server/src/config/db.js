import mongoose from 'mongoose';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

const RETRY_MS = 2000;

/** Connects, retrying until MongoDB is up (the local mongod may still be starting). */
export async function connectDb(uri, { retries = 30 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
      return mongoose.connection;
    } catch (err) {
      if (attempt >= retries) throw err;
      logger.warn({ attempt, err: err.message }, 'MongoDB not reachable, retrying');
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
