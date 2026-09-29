import nock from 'nock';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { modelRequestSchema, modelResponseSchema } from '@subsidence/shared';
import { createMockModelApp, mockPredict } from '../src/mockModel/app.js';
import { callModel } from '../src/services/modelClient/callModel.js';
import { sampleRequest } from './fixtures/modelRequest.js';

const URL = 'http://model.test';
const opts = { url: URL, retries: 2, timeoutMs: 200, backoffMs: [5, 5] };

afterEach(() => nock.cleanAll());

describe('model client', () => {
  it('returns a validated response', async () => {
    const req = sampleRequest();
    nock(URL).post('/predict').reply(200, mockPredict(req));
    const out = await callModel(req, opts);
    expect(out.attempts).toBe(1);
    expect(out.response.modelVersion).toBe('mock-1');
  });

  it('rejects a response that breaks the contract, without retrying', async () => {
    const req = sampleRequest();
    const scope = nock(URL)
      .post('/predict')
      .reply(200, { requestId: req.requestId, nodes: 'nope' });
    await expect(callModel(req, opts)).rejects.toMatchObject({ code: 'invalid_response' });
    expect(scope.isDone()).toBe(true);
  });

  it('rejects a response to a different request', async () => {
    const req = sampleRequest();
    nock(URL)
      .post('/predict')
      .reply(200, { ...mockPredict(req), requestId: 'other' });
    await expect(callModel(req, opts)).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('retries on timeout and then reports the model unreachable', async () => {
    const req = sampleRequest();
    const scope = nock(URL).post('/predict').times(3).delay(400).reply(200, mockPredict(req));
    await expect(callModel(req, opts)).rejects.toMatchObject({
      code: 'unreachable',
      message: expect.stringMatching(/timed out/),
    });
    expect(scope.isDone()).toBe(true);
  });

  it('retries after a 503 and succeeds', async () => {
    const req = sampleRequest();
    nock(URL).post('/predict').reply(503).post('/predict').reply(200, mockPredict(req));
    const out = await callModel(req, opts);
    expect(out.attempts).toBe(2);
  });

  it('does not retry a 400', async () => {
    const req = sampleRequest();
    const scope = nock(URL).post('/predict').reply(400, { error: 'bad' });
    await expect(callModel(req, opts)).rejects.toMatchObject({ code: 'unreachable' });
    expect(scope.isDone()).toBe(true);
  });
});

describe('mock model', () => {
  const app = createMockModelApp({ failRate: 0, latencyMs: [0, 0] });

  it('the sample request is contract-valid', () => {
    expect(modelRequestSchema.safeParse(sampleRequest()).success).toBe(true);
  });

  it('answers with a body that conforms to the shared response schema', async () => {
    const req = sampleRequest();
    const res = await request(app).post('/predict').send(req);
    expect(res.status).toBe(200);
    expect(modelResponseSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.requestId).toBe(req.requestId);
  });

  it('forecasts the accelerating node steepening toward failure, and the quiet one flat', async () => {
    const res = await request(app).post('/predict').send(sampleRequest());
    const [accel, quiet] = res.body.nodes;
    const h = (n, hh) => n.horizons.find((x) => x.h === hh);
    expect(h(accel, 24).p50_mm - h(accel, 6).p50_mm).toBeGreaterThan(
      h(accel, 6).p50_mm - h(accel, 1).p50_mm,
    );
    expect(accel.tCrit_h).toBeGreaterThan(0);
    expect(accel.tCrit_h).toBeLessThan(30);
    expect(quiet.tCrit_h).toBeNull();
    expect(h(quiet, 72).p50_mm).toBeCloseTo(0.1, 0);
    expect(res.body.zones[0]).toMatchObject({ zoneKey: 'Z-OW1', tCrit_h: accel.tCrit_h });
  });

  it('rejects an invalid request with 400', async () => {
    const res = await request(app).post('/predict').send({ requestId: 'x' });
    expect(res.status).toBe(400);
  });

  it('can fail with 503 so retries get exercised', async () => {
    const failing = createMockModelApp({ failRate: 1, latencyMs: [0, 0] });
    expect((await request(failing).post('/predict').send(sampleRequest())).status).toBe(503);
  });
});
