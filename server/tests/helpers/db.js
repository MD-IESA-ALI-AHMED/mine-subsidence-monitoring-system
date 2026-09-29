import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { resetSiteClocks } from '../../src/services/time/siteClock.js';

let server;

/** Starts an in-memory MongoDB 7 (time-series collections need >= 5) and connects Mongoose. */
export async function startDb() {
  server = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(server.getUri('subsidence-test'));
}

export async function stopDb() {
  await mongoose.disconnect();
  await server?.stop();
  resetSiteClocks();
}
