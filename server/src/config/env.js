import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(serverRoot, '.env') });

const bool = z.string().transform((v) => ['on', 'true', '1', 'yes'].includes(v.toLowerCase()));
// Hosting dashboards often save empty fields as "": treat them as not set.
const optional = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  LOG_LEVEL: z.string().default('info'),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/subsidence'),
  // Browser origins allowed to call the API and open the live socket (comma-separated).
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().positive().default(7),
  DEMO_EMAIL: z.string().trim().toLowerCase().min(3).default('demo@site01.local'),
  DEMO_PASSWORD: optional(z.string().min(10)),
  INGEST_API_KEY: optional(z.string().min(8)),
  DEFAULT_SITE_ID: z.string().default('site-01'),
  SIMULATOR: bool.default('on'),
  SIM_SPEED: z.coerce.number().positive().default(60),
  SIM_START_OFFSET_MIN: z.coerce.number().nonnegative().default(0),
  // After this many simulated days of live data the dummy site is reloaded and the story replays.
  // Keeps the database small (a free Atlas cluster holds 512 MB). 0 = never.
  SIM_LOOP_DAYS: z.coerce.number().nonnegative().default(3),
  MODEL_MODE: z.enum(['mock', 'remote']).default('mock'),
  // Leave empty to use the mock model built into this server (same HTTP contract).
  MODEL_URL: optional(z.string().url()),
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

const d = parsed.data;
export const EMBEDDED_MODEL_PATH = '/mock-model';

export const env = Object.freeze({
  ...d,
  isProd: d.NODE_ENV === 'production',
  isTest: d.NODE_ENV === 'test',
  corsOrigins: d.CORS_ORIGINS.split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  // No MODEL_URL: this server also serves the mock model and calls itself.
  embeddedModel: !d.MODEL_URL,
  MODEL_URL: d.MODEL_URL ?? `http://127.0.0.1:${d.PORT}${EMBEDDED_MODEL_PATH}`,
  serverRoot,
});
