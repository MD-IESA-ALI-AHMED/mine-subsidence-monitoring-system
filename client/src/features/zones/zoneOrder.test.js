import { describe, expect, it } from 'vitest';
import { sortZones } from './zoneOrder.js';

const z = (key, tier, used_h, score = 50) => ({
  zoneKey: key,
  severity: { tier, score },
  tCrit: { used_h },
});

describe('zone order', () => {
  it('sorts by tier, then time to limit', () => {
    const out = sortZones([
      z('A', 'watch', null),
      z('B', 'critical', 20),
      z('C', 'warning', 40),
      z('D', 'critical', 5),
    ]);
    expect(out.map((x) => x.zoneKey)).toEqual(['D', 'B', 'C', 'A']);
  });
  it('puts zones without a time to limit after those with one', () => {
    const out = sortZones([z('A', 'warning', null, 90), z('B', 'warning', 60, 10)]);
    expect(out.map((x) => x.zoneKey)).toEqual(['B', 'A']);
  });
});
