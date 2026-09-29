import axios from 'axios';
import { env } from '../../config/env.js';
import { dbState } from '../../config/db.js';

/** Liveness of server, database and model. Never throws. */
export async function getHealth() {
  let model = 'down';
  try {
    const res = await axios.get(`${env.MODEL_URL}/health`, { timeout: 1500 });
    model = res.status === 200 ? 'up' : 'down';
  } catch {
    model = 'down';
  }
  const db = dbState();
  return {
    status: db === 'up' ? 'ok' : 'degraded',
    server: 'up',
    db,
    model,
    modelMode: env.MODEL_MODE,
    time: new Date().toISOString(),
  };
}
