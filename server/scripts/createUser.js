// Creates a dashboard user. There is no public sign-up.
//   npm run user:create -- --email a.kumar@example.com --name "A. Kumar"
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import bcrypt from 'bcrypt';
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/modules/auth/model.js';
import { BCRYPT_COST } from '../src/services/seed/seedDatabase.js';

const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
if (!values.email || !values.name) {
  console.error('Usage: npm run user:create -- --email <email> --name "<name>"');
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = await askHidden('Password (at least 10 characters): ');
if (password.length < 10) {
  console.error('Password is too short.');
  process.exit(1);
}

await connectDb(env.MONGO_URI, { retries: 3 });
const email = values.email.toLowerCase().trim();
if (await User.exists({ email })) {
  console.error(`A user with ${email} already exists.`);
} else {
  await User.create({
    email,
    name: values.name,
    passwordHash: await bcrypt.hash(password, BCRYPT_COST),
  });
  console.log(`Created ${email}.`);
}
await disconnectDb();
