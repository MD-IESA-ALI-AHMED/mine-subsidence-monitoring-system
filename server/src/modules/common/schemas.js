import { z } from 'zod';
import { env } from '../../config/env.js';

export const siteIdParam = z.string().trim().min(1).max(40).default(env.DEFAULT_SITE_ID);
export const nodeId = z
  .string()
  .trim()
  .regex(/^[A-Z]{1,3}-\d{1,3}$/, 'Invalid node ID');
export const isoDate = z.coerce.date();
export const csv = z.string().transform((s) =>
  s
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
);
