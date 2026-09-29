import { describe, expect, it } from 'vitest';
import { statusItems } from './statusItems.js';

const siteNow = new Date('2026-10-03T08:50:00Z');
const base = {
  meshOnline: 58,
  meshTotal: 60,
  rootId: 'R-01',
  degraded: false,
  lastReadingAt: '2026-10-03T08:48:00Z',
  simulated: true,
  model: { mode: 'mock', reachable: true },
};
const run = (status, extra = {}) =>
  statusItems({
    status,
    siteNow,
    conn: 'connected',
    lastMessageWall: 1000,
    wallNow: 13000,
    ...extra,
  });
const byKey = (items) => Object.fromEntries(items.map((i) => [i.key, i]));

describe('status strip', () => {
  it('shows a healthy site', () => {
    const items = byKey(run(base));
    expect(items.mesh).toMatchObject({ text: 'mesh 58/60', level: 'ok' });
    expect(items.root.text).toBe('root R-01');
    expect(items.model.text).toBe('model mock');
    expect(items.data.text).toBe('data 12 s ago');
    expect(items.sim.text).toBe('Simulated data');
  });

  it('says when the mesh is degraded and who is root now', () => {
    const items = byKey(
      run({ ...base, degraded: true, rootId: 'R-02', degradedSince: '2026-10-03T04:32:00Z' }),
    );
    expect(items.degraded).toMatchObject({
      text: 'Degraded — root lost 10:02, R-02 now root',
      level: 'warning',
    });
  });

  it('says when the model is unreachable and how old the forecast is', () => {
    const items = byKey(
      run({
        ...base,
        model: { mode: 'remote', reachable: false, lastGoodAt: '2026-10-03T08:50:00Z' },
      }),
    );
    expect(items.model).toMatchObject({
      text: 'Model unreachable — showing forecast from 14:20',
      level: 'warning',
    });
  });

  it('warns when no data has come for more than three intervals', () => {
    const items = byKey(run({ ...base, lastReadingAt: '2026-10-03T08:16:00Z' }));
    expect(items.data).toMatchObject({ text: 'No new data for 34 min', level: 'warning' });
  });

  it('shows reconnecting when the socket drops', () => {
    expect(byKey(run(base, { conn: 'reconnecting' })).socket.text).toBe('Reconnecting…');
  });
});
