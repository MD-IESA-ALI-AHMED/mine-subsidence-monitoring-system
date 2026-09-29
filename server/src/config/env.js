import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(serverRoot, '.env') });

const bool = z.string().transform((v) => ['on', 'true', '1', 'yes'].includes(v.toLowerCase()));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  LOG_LEVEL: z.string().default('info'),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/subsidence'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().positive().default(7),
  DEMO_PASSWORD: z.string().min(10).optional(),
  INGEST_API_KEY: z.string().min(8).optional(),
  DEFAULT_SITE_ID: z.string().default('site-01'),
  SIMULATOR: bool.default('on'),
  SIM_SPEED: z.coerce.number().positive().default(60),
  SIM_START_OFFSET_MIN: z.coerce.number().nonnegative().default(0),
  MODEL_MODE: z.enum(['mock', 'remote']).default('mock'),
  MODEL_URL: z.string().url().default('http://localhost:8001'),
  MODEL_API_KEY: z.string().optional().default(''),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  MODEL_RETRIES: z.coerce.number().int().nonnegative().default(2),
  MODEL_MIN_INTERVAL_MIN: z.coerce.number().nonnegative().default(5),
  MOCK_MODEL_PORT: z.coerce.number().int().default(8001),
  MOCK_MODEL_FAIL_RATE: z.coerce.number().min(0).max(1).default(0.02),
  RETENTION_DAYS: z.coerce.number().positive().default(30),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  // Logger depends on env, so this one message goes straight to stderr.
  process.stderr.write(`Invalid environment (see server/.env.example):\n${issues}\n`);
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  serverRoot,
});
