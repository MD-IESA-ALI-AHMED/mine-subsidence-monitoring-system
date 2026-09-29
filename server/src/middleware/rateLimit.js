import { rateLimit } from 'express-rate-limit';

const tooMany = (_req, res) =>
  res.status(429).json({
    error: { code: 'too_many_attempts', message: 'Too many attempts. Try again in 15 minutes.' },
  });

/** 5 failed sign-ins per 15 minutes per IP and email. Successful sign-ins do not count. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${req.ip ?? ''}|${String(req.body?.email ?? '')
      .toLowerCase()
      .trim()}`,
  handler: tooMany,
});

/** General ceiling for the API, generous enough for a dashboard left open all shift. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany,
});
