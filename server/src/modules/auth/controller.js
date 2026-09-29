import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  verifyAccess,
} from './tokens.js';
import * as auth from './service.js';

export async function login(req, res) {
  const { user, access, refresh } = await auth.login(req.body);
  setAuthCookies(res, { access, refresh });
  res.json({ user });
}

export async function refresh(req, res) {
  try {
    const { user, access, refresh: next } = await auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    setAuthCookies(res, { access, refresh: next });
    res.json({ user });
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}

export async function logout(req, res) {
  let userId = null;
  try {
    userId = verifyAccess(req.cookies?.[ACCESS_COOKIE]).sub;
  } catch {
    // Signing out with an expired access token is fine.
  }
  await auth.logout(req.cookies?.[REFRESH_COOKIE], userId);
  clearAuthCookies(res);
  res.status(204).end();
}

export async function me(req, res) {
  res.json({ user: await auth.me(req.user.id) });
}
