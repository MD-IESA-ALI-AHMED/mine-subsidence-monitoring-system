import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/modules/audit/model.js';
import { raiseZoneAlert } from '../src/modules/alerts/service.js';
import { seedDatabase } from '../src/services/seed/seedDatabase.js';
import { signedInAgent } from './helpers/agent.js';
import { startDb, stopDb } from './helpers/db.js';

let agent;
let seeded;
const at = (days, hours = 0) => new Date(seeded.start.getTime() + (days * 24 + hours) * 3600_000);

beforeAll(async () => {
  await startDb();
  seeded = await seedDatabase({ demoPassword: process.env.DEMO_PASSWORD });
  agent = await signedInAgent();
});
afterAll(stopDb);

describe('read API over the seeded site', () => {
  it('lists 60 nodes with latest values and status', async () => {
    const res = await agent.get('/api/nodes?siteId=site-01');
    expect(res.status).toBe(200);
    expect(res.body.nodes).toHaveLength(60);
    const silent = res.body.nodes.find((n) => n.status === 'silent_after_rise');
    expect(silent).toBeTruthy();
    expect(res.body.nodes.find((n) => n.id === 'N-001').latest.sinking_mm).toBeTypeOf('number');
  });

  it('returns one node with its mesh path to the root', async () => {
    const res = await agent.get('/api/nodes/N-041');
    expect(res.status).toBe(200);
    expect(res.body.node.meshPath[0]).toBe('N-041');
    expect(res.body.node.meshPath.at(-1)).toBe('R-01');
  });

  it('returns a columnar time series and downsamples long ranges', async () => {
    const short = await agent.get(
      `/api/nodes/N-041/readings?from=${at(6).toISOString()}&to=${at(7).toISOString()}&fields=sinking_mm`,
    );
    expect(short.body.step).toBeNull();
    expect(short.body.t.length).toBeGreaterThan(100);
    expect(short.body.values.sinking_mm).toHaveLength(short.body.t.length);
    const long = await agent.get(
      `/api/nodes/N-041/readings?from=${at(0).toISOString()}&to=${at(7).toISOString()}&step=60`,
    );
    expect(long.body.step).toBe(60);
    expect(long.body.t.length).toBeLessThanOrEqual(169);
  });

  it('serves the terrain grid as base64 Float32 arrays', async () => {
    const res = await agent.get('/api/sites/site-01/terrain?res=8');
    expect(res.status).toBe(200);
    const bytes = Buffer.from(res.body.sinking, 'base64');
    expect(bytes.length).toBe(res.body.nx * res.body.ny * 4);
    expect(res.body.maxSinking_mm).toBeGreaterThan(100);
    expect(res.body.faces[0].panelId).toBe('P1');
  });

  it('returns the site maximum speed per hour', async () => {
    const res = await agent.get(
      `/api/sites/site-01/speed-history?from=${at(6).toISOString()}&to=${at(7).toISOString()}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.t.length).toBeGreaterThanOrEqual(23);
    expect(Math.max(...res.body.maxSpeed)).toBeGreaterThan(50); // the P1 trough
    expect(res.body.nodeId).toHaveLength(res.body.t.length);
  });

  it('replays the mesh as it was during the root failure (scenario I)', async () => {
    const during = await agent.get(`/api/links?siteId=site-01&at=${at(5, 11).toISOString()}`);
    expect(during.body.rootId).toBe('R-02');
    expect(during.body.degraded).toBe(true);
    const after = await agent.get(`/api/links?siteId=site-01&at=${at(5, 14).toISOString()}`);
    expect(after.body.rootId).toBe('R-01');
    expect(after.body.degraded).toBe(false);
  });

  it('filters events by kind', async () => {
    const res = await agent.get('/api/events?siteId=site-01&kind=blast,seating_shift');
    expect(res.body.events.filter((e) => e.kind === 'blast')).toHaveLength(7);
    expect(res.body.events.some((e) => e.kind === 'seating_shift')).toBe(true);
  });

  it('streams a CSV export with a descriptive filename and audits it', async () => {
    const from = at(6).toISOString();
    const to = at(7).toISOString();
    const res = await agent.get(`/api/export/readings.csv?nodeIds=N-041&from=${from}&to=${to}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(
      /site-01_N-041_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv/,
    );
    const lines = res.text.trim().split('\n');
    expect(lines[0].startsWith('ts,nodeId,sinking_mm')).toBe(true);
    expect(lines.length).toBeGreaterThan(100);
    expect(await AuditLog.countDocuments({ action: 'export_csv' })).toBe(1);
  });
});

describe('alerts', () => {
  it('acknowledges with a note, records who and when, and refuses short notes', async () => {
    const alert = await raiseZoneAlert({
      siteId: 'site-01',
      zoneKey: 'Z-TEST',
      nodeIds: ['N-041'],
      tier: 'warning',
      title: 'Z-TEST warning',
      reason: 'test',
      at: new Date(),
    });
    expect(
      await raiseZoneAlert({
        siteId: 'site-01',
        zoneKey: 'Z-TEST',
        tier: 'warning',
        at: new Date(),
      }),
    ).toBeNull();

    const short = await agent.post(`/api/alerts/${alert._id}/acknowledge`).send({ note: 'ok' });
    expect(short.status).toBe(400);
    const ok = await agent
      .post(`/api/alerts/${alert._id}/acknowledge`)
      .send({ note: 'Inspected on site, cordon placed' });
    expect(ok.status).toBe(200);
    expect(ok.body.alert.state).toBe('acknowledged');
    expect(ok.body.alert.acknowledgedBy).toBe('Duty Engineer');
    const open = await agent.get('/api/alerts?state=open');
    expect(open.body.alerts.find((a) => a._id === String(alert._id))).toBeUndefined();
  });
});

describe('ingest', () => {
  const frame = () => ({
    siteId: 'site-01',
    frames: [{ nodeId: 'N-001', ts: new Date().toISOString(), sinking_mm: 0.4, battery_mV: 3900 }],
  });

  it('rejects requests without the API key', async () => {
    const res = await request(createApp()).post('/api/ingest/frames').send(frame());
    expect(res.status).toBe(401);
  });

  it('accepts frames with the API key', async () => {
    const res = await request(createApp())
      .post('/api/ingest/frames')
      .set('x-api-key', process.env.INGEST_API_KEY)
      .send(frame());
    expect(res.status).toBe(202);
    expect(res.body.stored).toBe(1);
  });
});
