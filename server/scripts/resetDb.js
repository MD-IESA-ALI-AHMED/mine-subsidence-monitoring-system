// Drops the whole database. The next `npm run dev` (or `npm run seed`) loads the dummy site again.
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/config/db.js';

await connectDb(env.MONGO_URI, { retries: 3 });
await mongoose.connection.dropDatabase();
console.log(`Dropped ${mongoose.connection.name}.`);
await disconnectDb();
