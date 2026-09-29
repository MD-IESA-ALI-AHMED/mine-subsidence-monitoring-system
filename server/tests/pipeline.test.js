import nock from 'nock';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mockPredict } from '../src/mockModel/app.js';
import { Alert } from '../src/modules/alerts/model.js';
import { Prediction } from '../src/modules/predictions/model.js';
import { SystemStatus } from '../src/modules/system/model.js';
import { runPipeline } from '../src/services/pipeline/runPipeline.js';
import { seedDatabase } from '../src/services/seed/seedDatabase.js';
import { startDb, stopDb } from './helpers/db.js';

const MODEL = 'http://model.test'; // MODEL_URL in tests/setupEnv.js
let seeded;
const minutesAfterEnd = (m) => new Date(seeded.end.getTime() + m * 60000);
const modelUp = () =>
  nock(MODEL)
    .post('/predict')
    .reply(200, (_uri, body) => mockPredict(body));

beforeAll(async () => {
  await startDb();
  seeded = await seedDatabase({ demoPassword: process.env.DEMO_PASSWORD });
});
afterAll(stopDb);
afterEach(() => nock.cleanAll());

describe('pipeline end to end', () => {
  let first;

  it('finds the scripted zones with the expected tiers at the end of the history', async () => {
    modelUp();
    first = await runPipeline('site-01', seeded.end);
    const byKey = Object.fromEntries(first.zones.map((z) => [z.zoneKey, z]));
    expect(first.gate.open).toBe(true);
    expect(byKey['Z-P1'].severity.tier).toBe('watch'); // A: normal trough
    expect(byKey['Z-P1-SE'].severity.tier).toBe('warning'); // B: more than expected
    expect(byKey['Z-OW1'].severity.tier).toBe('warning'); // C: accelerating, not yet < 24 h
    expect(byKey['Z-OW1'].accelerating).toBe(true);
    expect(byKey['Z-OW1'].hasSilentAfterRise).toBe(true); // G
    expect(byKey['Z-OW1'].tCrit.model_h).toBeGreaterThan(24);
    expect(byKey['Z-P1'].peakExcess_mm).toBeLessThan(5);
  });

  it('stores the prediction and marks the model reachable', async () => {
    expect(first.prediction.fresh).toBe(true);
    expect(await Prediction.countDocuments()).toBe(1);
    const status = await SystemStatus.findById('site-01').lean();
    expect(status.model.reachable).toBe(true);
    expect(status.model.modelVersion).toBe('mock-1');
    expect(status.meshOnline).toBe(58);
  });

  it('raises one alert per zone whose tier rose', async () => {
    const alerts = await Alert.find({ kind: 'zone' }).lean();
    expect(alerts.map((a) => `${a.zoneKey}:${a.tier}`).sort()).toEqual([
      'Z-OW1:warning',
      'Z-P1-SE:warning',
      'Z-P1:watch',
    ]);
    expect(alerts.find((a) => a.zoneKey === 'Z-OW1').reason).toMatch(/speeding up/);
  });

  it('is idempotent for the same run and never runs twice at once', async () => {
    expect((await runPipeline('site-01', seeded.end)).skipped).toBe('done');
    modelUp();
    modelUp();
    const [a, b] = await Promise.all([
      runPipeline('site-01', minutesAfterEnd(1)),
      runPipeline('site-01', minutesAfterEnd(2)),
    ]);
    expect([a.skipped, b.skipped]).toContain('busy');
    // The same zone never has two open alerts at the same tier.
    const keys = (await Alert.find({ kind: 'zone' }).lean()).map((x) => `${x.zoneKey}:${x.tier}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps the last forecast when the model is down, and says so', async () => {
    nock(MODEL).post('/predict').times(3).reply(503);
    const run = await runPipeline('site-01', minutesAfterEnd(120));
    expect(run.prediction.fresh).toBe(false);
    expect(run.prediction.error).toMatch(/unreachable/i);
    const status = await SystemStatus.findById('site-01').lean();
    expect(status.model.reachable).toBe(false);
    expect(status.model.lastError).toMatch(/503/);
    // No mock fallback: still the one stored forecast, now two hours older.
    const ow1 = run.zones.find((z) => z.zoneKey === 'Z-OW1');
    const before = first.zones.find((z) => z.zoneKey === 'Z-OW1');
    expect(ow1.tCrit.model_h).toBeCloseTo(before.tCrit.model_h - 2, 0);
  }, 20000);
});
