import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/system/health', () => {
  it('reports server liveness without auth', async () => {
    const res = await request(createApp()).get('/api/system/health');
    expect(res.status).toBe(200);
    expect(res.body.server).toBe('up');
    expect(['up', 'down']).toContain(res.body.db);
  });

  it('returns the error envelope for unknown routes', async () => {
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
