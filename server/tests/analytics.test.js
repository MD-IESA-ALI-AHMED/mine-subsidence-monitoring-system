import { describe, expect, it } from 'vitest';
import { inverseVelocity } from '../src/services/inverseVelocity/inverseVelocity.js';
import { combineTCrit, scoreZone } from '../src/services/severity/severity.js';
import { jaccard, stDbscan } from '../src/services/zones/stDbscan.js';
import { assignKeys } from '../src/services/zones/zoneKeys.js';
import { thresholds as th } from './fixtures/thresholds.js';

describe('ST-DBSCAN', () => {
  const p = (id, x, y, f) => ({ id, x, y, f });
  const points = [
    // Tight cluster A, all moving the same way.
    p('a1', 0, 0, [1, 1]),
    p('a2', 10, 0, [1.1, 1]),
    p('a3', 0, 10, [1, 0.9]),
    p('a4', 10, 10, [0.9, 1.1]),
    // Right next to A in space but moving very differently: its own cluster B.
    p('b1', 20, 0, [3, 3]),
    p('b2', 30, 0, [3.1, 3]),
    p('b3', 20, 10, [3, 2.9]),
    // Far away single point: noise.
    p('n1', 200, 200, [1, 1]),
  ];

  it('separates clusters by position and by movement, and drops noise', () => {
    const clusters = stDbscan(points, { eps1: 15, eps2: 0.5, minPts: 3 }).map((c) => c.sort());
    expect(clusters).toHaveLength(2);
    expect(clusters).toContainEqual(['a1', 'a2', 'a3', 'a4']);
    expect(clusters).toContainEqual(['b1', 'b2', 'b3']);
  });

  it('merges them when the movement threshold is loose', () => {
    const clusters = stDbscan(points, { eps1: 15, eps2: 5, minPts: 3 });
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(7);
  });

  it('keeps zone keys stable across runs by node overlap', () => {
    expect(jaccard(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(0.5);
    const site = { panels: [], thresholds: th };
    const prev = [{ zoneKey: 'Z-OW1', nodeIds: ['a', 'b', 'c', 'd'] }];
    const keys = assignKeys(
      [
        { nodeIds: ['b', 'c', 'd', 'e'], centroid: [0, 0] },
        { nodeIds: ['x', 'y', 'z'], centroid: [500, 500] },
      ],
      prev,
      site,
      new Date(),
    );
    expect(keys[0]).toBe('Z-OW1');
    expect(keys[1]).not.toBe('Z-OW1');
  });
});

describe('inverse velocity', () => {
  it('finds the failure time when 1/speed falls in a straight line', () => {
    // speed = A / (tf − t) with tf = 30 h from now.
    const series = [];
    for (let h = -36; h <= 0; h += 1) series.push({ tHours: h, speed_mmPerDay: 900 / (30 - h) });
    const iv = inverseVelocity(series);
    expect(iv.slope).toBeLessThan(0);
    expect(iv.tCrit_h).toBeCloseTo(30, 0);
  });

  it('is robust to a few wild points (Theil–Sen)', () => {
    const series = [];
    for (let h = -36; h <= 0; h += 1) series.push({ tHours: h, speed_mmPerDay: 900 / (30 - h) });
    series[5].speed_mmPerDay = 500;
    series[20].speed_mmPerDay = 2;
    expect(inverseVelocity(series).tCrit_h).toBeCloseTo(30, 0);
  });

  it('reports nothing for steady or slowing ground', () => {
    const steady = Array.from({ length: 37 }, (_, i) => ({ tHours: i - 36, speed_mmPerDay: 12 }));
    const slowing = Array.from({ length: 37 }, (_, i) => ({
      tHours: i - 36,
      speed_mmPerDay: 40 - i,
    }));
    expect(inverseVelocity(steady).tCrit_h).toBeNull();
    expect(inverseVelocity(slowing).tCrit_h).toBeNull();
  });
});

describe('severity', () => {
  const base = {
    peakExcess_mm: 0,
    maxSpeed_mmPerDay: 0,
    accelerating: false,
    area_m2: 0,
    deviation_mm: 0,
    nearVillage: false,
    hasSilentAfterRise: false,
    tCritUsed_h: null,
  };

  it('adds up the six parts with the configured weights', () => {
    const s = scoreZone(
      {
        ...base,
        peakExcess_mm: th.limitSinking_mm,
        maxSpeed_mmPerDay: th.limitSpeed_mmPerDay,
        accelerating: true,
        area_m2: 4000,
        deviation_mm: 100,
        nearVillage: true,
      },
      th,
    );
    expect(s.score).toBe(100);
    expect(s.parts).toEqual({
      sinking: 25,
      speed: 25,
      accel: 20,
      extent: 10,
      deviation: 15,
      proximity: 5,
    });
    expect(s.tier).toBe('critical');
  });

  it('maps score to tier at the cut-offs', () => {
    expect(scoreZone(base, th).tier).toBe('normal');
    expect(scoreZone({ ...base, maxSpeed_mmPerDay: th.limitSpeed_mmPerDay }, th).tier).toBe(
      'watch',
    );
  });

  it('forces critical when the time to limit is under 24 h', () => {
    const s = scoreZone({ ...base, tCritUsed_h: 20 }, th);
    expect(s.tier).toBe('critical');
    expect(s.overrides[0]).toMatch(/under 24 h/);
  });

  it('forces at least warning when a node went silent after rising', () => {
    expect(scoreZone({ ...base, hasSilentAfterRise: true }, th).tier).toBe('warning');
    const alreadyCritical = scoreZone({ ...base, hasSilentAfterRise: true, tCritUsed_h: 5 }, th);
    expect(alreadyCritical.tier).toBe('critical');
  });

  it('uses the smaller of the two time-to-limit estimates, ignoring nulls', () => {
    expect(combineTCrit(30, 26)).toEqual({ used_h: 26, method: 'inverse_velocity' });
    expect(combineTCrit(null, 26)).toEqual({ used_h: 26, method: 'inverse_velocity' });
    expect(combineTCrit(null, null)).toEqual({ used_h: null, method: null });
  });
});
