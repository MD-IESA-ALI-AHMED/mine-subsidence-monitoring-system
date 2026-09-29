import bcrypt from 'bcrypt';
import { logger } from '../../config/logger.js';
import { User } from '../../modules/auth/model.js';
import { readJson } from './dummyFiles.js';
import { BCRYPT_COST } from './seedDatabase.js';

/**
 * Keeps the demo user's password equal to DEMO_PASSWORD, so changing it in server/.env after the
 * database was first seeded takes effect on the next start. Other users are never touched.
 */
export async function syncDemoUser(demoPassword) {
  if (!demoPassword) return false;
  let changed = false;
  for (const { email, name } of readJson('users.json')) {
    const user = await User.findOne({ email });
    if (!user) {
      await User.create({
        email,
        name,
        passwordHash: await bcrypt.hash(demoPassword, BCRYPT_COST),
      });
      changed = true;
    } else if (!(await bcrypt.compare(demoPassword, user.passwordHash))) {
      user.passwordHash = await bcrypt.hash(demoPassword, BCRYPT_COST);
      await user.save();
      changed = true;
    }
  }
  if (changed) logger.info('Demo user password set from DEMO_PASSWORD');
  return changed;
}
