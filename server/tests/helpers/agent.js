import request from 'supertest';
import { createApp } from '../../src/app.js';

export const DEMO = { email: 'demo@site01.local', password: process.env.DEMO_PASSWORD };

/** A supertest agent (keeps cookies) that is already signed in. */
export async function signedInAgent(app = createApp()) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send(DEMO);
  if (res.status !== 200)
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

/** Extracts a cookie value from a supertest response. */
export function cookieFrom(res, name) {
  const raw = [].concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));
  return raw ? raw.split(';')[0].slice(name.length + 1) : null;
}
