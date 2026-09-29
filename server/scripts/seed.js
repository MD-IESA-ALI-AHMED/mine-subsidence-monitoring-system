// Resets the database and loads the dummy site, shifted so the history ends at the latest IST midnight.
//   npm run seed
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { seedDatabase } from '../src/services/seed/seedDatabase.js';

if (!env.DEMO_PASSWORD) {
  console.error('Set DEMO_PASSWORD (at least 10 characters) in server/.env first.');
  process.exit(1);
}

const started = Date.now();
await connectDb(env.MONGO_URI, { retries: 3 }).catch(() => {
  console.error(`MongoDB is not reachable at ${env.MONGO_URI}. Start it with \`npm run mongo\`.`);
  process.exit(1);
});
const res = await seedDatabase({ demoPassword: env.DEMO_PASSWORD, log: (m) => console.log(m) });
console.log(
  `Done in ${((Date.now() - started) / 1000).toFixed(1)} s. Sign in as ${res.users.join(', ')}.`,
);
await disconnectDb();
