import bcrypt from 'bcrypt';
import { logger } from '../../config/logger.js';
import { User } from '../../modules/auth/model.js';
import { readJson } from './dummyFiles.js';
import { BCRYPT_COST } from './seedDatabase.js';

/**
 * Keeps the demo account in line with DEMO_EMAIL and DEMO_PASSWORD, so changing either after the
 * database was first seeded takes effect on the next start. Other users are never touched.
 */
export async function syncDemoUser(demoPassword, demoEmail) {
  if (!demoPassword) return false;
  const email = demoEmail.toLowerCase();
  const [{ name }] = readJson('users.json');
  // The demo account is the one marked isDemo; older databases marked nothing, so fall back to
  // the address from the original seed.
  let user =
    (await User.findOne({ isDemo: true })) ??
    (await User.findOne({ email })) ??
    (await User.findOne({ email: 'demo@site01.local' }));
  const changes = [];
  if (!user) {
    user = new User({ name, email, isDemo: true });
    changes.push('created');
  }
  if (user.email !== email) {
    if (await User.exists({ email, _id: { $ne: user._id } })) {
      logger.warn({ email }, 'DEMO_EMAIL already belongs to another user; demo email not changed');
    } else {
      user.email = email;
      changes.push('email');
    }
  }
  if (!user.isDemo) user.isDemo = true;
  if (!user.passwordHash || !(await bcrypt.compare(demoPassword, user.passwordHash))) {
    user.passwordHash = await bcrypt.hash(demoPassword, BCRYPT_COST);
    changes.push('password');
  }
  if (changes.length || user.isModified()) await user.save();
  if (changes.length) logger.info({ email: user.email, changes }, 'Demo account updated');
  return changes.length > 0;
}
