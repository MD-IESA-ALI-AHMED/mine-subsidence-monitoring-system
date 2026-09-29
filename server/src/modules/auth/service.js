import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { unauthorized } from '../../middleware/error.js';
import { recordAudit } from '../audit/service.js';
import { User } from './model.js';
import { Session } from './sessionModel.js';
import { refreshExpiry, signAccess, signRefresh, verifyRefresh } from './tokens.js';

// Parallel tabs may refresh with the same token at the same moment; within this window the
// second request gets the token the first one already rotated to, instead of a reuse alarm.
const REUSE_GRACE_MS = 10_000;
const LOGIN_FAILED = 'Email or password is incorrect';
// Compared against when the email is unknown, so timing does not reveal which emails exist.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash(randomUUID(), 12));

export const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email });

async function issue(user, family = randomUUID()) {
  const jti = randomUUID();
  await Session.create({ _id: jti, userId: user._id, family, expiresAt: refreshExpiry() });
  return { jti, access: signAccess(user), refresh: signRefresh({ jti, userId: user._id, family }) };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw unauthorized(LOGIN_FAILED);
  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issue(user);
  await recordAudit({ userId: user._id, action: 'login', target: user.email });
  return { user: publicUser(user), ...tokens };
}

export async function refresh(token) {
  if (!token) throw unauthorized('Session expired');
  let claims;
  try {
    claims = verifyRefresh(token);
  } catch {
    throw unauthorized('Session expired');
  }
  const session = await Session.findById(claims.jti);
  if (!session || session.revokedAt) throw unauthorized('Session expired');
  const user = await User.findById(session.userId);
  if (!user) throw unauthorized('Session expired');

  if (session.replacedBy) {
    const age = Date.now() - session.replacedAt.getTime();
    if (age > REUSE_GRACE_MS) {
      // A rotated token came back: assume it was stolen and end the whole session family.
      await Session.updateMany({ family: session.family }, { revokedAt: new Date() });
      await recordAudit({ userId: user._id, action: 'refresh_reuse', target: session.family });
      throw unauthorized('Session expired');
    }
    const next = await Session.findById(session.replacedBy);
    if (!next || next.revokedAt) throw unauthorized('Session expired');
    return {
      user: publicUser(user),
      access: signAccess(user),
      refresh: signRefresh({ jti: next._id, userId: user._id, family: next.family }),
    };
  }

  const tokens = await issue(user, session.family);
  session.replacedBy = tokens.jti;
  session.replacedAt = new Date();
  await session.save();
  return { user: publicUser(user), ...tokens };
}

export async function logout(token, userId) {
  if (token) {
    try {
      const { jti } = verifyRefresh(token);
      const s = await Session.findById(jti);
      if (s) await Session.updateMany({ family: s.family }, { revokedAt: new Date() });
    } catch {
      // Expired or invalid token: nothing to revoke.
    }
  }
  if (userId) await recordAudit({ userId, action: 'logout' });
}

export async function me(userId) {
  const user = await User.findById(userId);
  if (!user) throw unauthorized();
  return publicUser(user);
}
