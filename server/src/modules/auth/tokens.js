import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export const ACCESS_COOKIE = 'sd_access';
export const REFRESH_COOKIE = 'sd_refresh';
const REFRESH_PATH = '/api/auth';

const accessTtlSec = () => Math.round(env.ACCESS_TOKEN_TTL_MIN * 60);
const refreshTtlSec = () => Math.round(env.REFRESH_TOKEN_TTL_DAYS * 86400);

export function signAccess(user) {
  return jwt.sign({ name: user.name, email: user.email }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id),
    expiresIn: accessTtlSec(),
  });
}

export function signRefresh({ jti, userId, family }) {
  return jwt.sign({ fam: family }, env.JWT_REFRESH_SECRET, {
    subject: String(userId),
    jwtid: jti,
    expiresIn: refreshTtlSec(),
  });
}

export const verifyAccess = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
export const verifyRefresh = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

export const refreshExpiry = () => new Date(Date.now() + refreshTtlSec() * 1000);

const baseCookie = () => ({ httpOnly: true, sameSite: 'strict', secure: env.isProd });

export function setAuthCookies(res, { access, refresh }) {
  res.cookie(ACCESS_COOKIE, access, { ...baseCookie(), path: '/', maxAge: accessTtlSec() * 1000 });
  if (refresh) {
    res.cookie(REFRESH_COOKIE, refresh, {
      ...baseCookie(),
      path: REFRESH_PATH,
      maxAge: refreshTtlSec() * 1000,
    });
  }
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: REFRESH_PATH });
}
