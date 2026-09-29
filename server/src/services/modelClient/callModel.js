import axios from 'axios';
import { env } from '../../config/env.js';
import { ModelError, validateModelResponse } from './validateResponse.js';

const BACKOFF_MS = [500, 1500, 3000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryable(err) {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return true;
  if (!err.response) return true; // network error, connection refused
  return err.response.status >= 500 || err.response.status === 429;
}

function describe(err) {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return 'timed out';
  if (err.response) return `HTTP ${err.response.status}`;
  return err.code ?? err.message;
}

/**
 * POST {MODEL_URL}/predict with timeout, retries (500 ms, 1500 ms backoff) and contract
 * validation. The same code path serves the mock and the real model; only MODEL_URL changes.
 * Returns { response, latency_ms, attempts }.
 */
export async function callModel(request, opts = {}) {
  const url = opts.url ?? env.MODEL_URL;
  const retries = opts.retries ?? env.MODEL_RETRIES;
  const timeout = opts.timeoutMs ?? env.MODEL_TIMEOUT_MS;
  const headers = { 'content-type': 'application/json' };
  if (env.MODEL_API_KEY) headers['x-api-key'] = env.MODEL_API_KEY;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const started = Date.now();
    try {
      const res = await axios.post(`${url}/predict`, request, { timeout, headers });
      const response = validateModelResponse(res.data, request);
      return { response, latency_ms: Date.now() - started, attempts: attempt + 1 };
    } catch (err) {
      if (err instanceof ModelError) throw err; // a wrong answer is not fixed by asking again
      lastErr = err;
      if (!retryable(err) || attempt === retries) break;
      await sleep(opts.backoffMs?.[attempt] ?? BACKOFF_MS[attempt] ?? 3000);
    }
  }
  throw new ModelError('unreachable', `Model unreachable (${describe(lastErr)})`);
}
