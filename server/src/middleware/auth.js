import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { ACCESS_COOKIE, verifyAccess } from '../modules/auth/tokens.js';
import { HttpError, unauthorized } from './error.js';

/** Requires a valid access cookie; sets req.user = { id, name, email }. */
export function requireAuth(req, _res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(unauthorized());
  try {
    const claims = verifyAccess(token);
    req.user = { id: claims.sub, name: claims.name, email: claims.email };
    return next();
  } catch (err) {
    return next(
      err.name === 'TokenExpiredError'
        ? new HttpError(401, 'token_expired', 'Session expired')
        : unauthorized(),
    );
  }
}

/** For the gateway: x-api-key must equal INGEST_API_KEY. */
export function requireIngestKey(req, _res, next) {
  const given = Buffer.from(String(req.get('x-api-key') ?? ''));
  const expected = Buffer.from(env.INGEST_API_KEY ?? '');
  const ok =
    expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
  return ok ? next() : next(unauthorized('Invalid API key'));
}
