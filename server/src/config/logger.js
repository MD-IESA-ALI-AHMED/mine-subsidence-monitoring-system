import pino from 'pino';
import { env } from './env.js';

const transport =
  env.isProd || env.isTest
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };

export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  transport,
  redact: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-api-key"]'],
});
