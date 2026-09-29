import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import * as c from './controller.js';
import { loginBody } from './schemas.js';

export function authRoutes() {
  const r = Router();
  r.post('/login', loginLimiter, validate({ body: loginBody }), asyncHandler(c.login));
  r.post('/refresh', asyncHandler(c.refresh));
  r.post('/logout', asyncHandler(c.logout));
  r.get('/me', requireAuth, asyncHandler(c.me));
  return r;
}
