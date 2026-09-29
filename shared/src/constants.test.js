import { describe, expect, it } from 'vitest';
import {
  batteryPct,
  maxTier,
  mmPerMToDeg,
  modelResponseSchema,
  tierFromScore,
  TIERS,
  uradToMmPerM,
} from './index.js';

describe('tiers', () => {
  it('keeps the tier order', () => {
    expect(TIERS).toEqual(['normal', 'watch', 'warning', 'critical']);
  });
  it('picks the highest tier', () => {
    expect(maxTier('watch', 'critical', 'normal')).toBe('critical');
    expect(maxTier()).toBe('normal');
  });
  it('maps score to tier at the cut-offs', () => {
    expect(tierFromScore(24.9)).toBe('normal');
    expect(tierFromScore(25)).toBe('watch');
    expect(tierFromScore(45)).toBe('warning');
    expect(tierFromScore(70)).toBe('critical');
  });
});

describe('units', () => {
  it('converts tilt', () => {
    expect(uradToMmPerM(1500)).toBe(1.5);
    expect(mmPerMToDeg(1000)).toBeCloseTo(45);
  });
  it('clamps battery percentage', () => {
    expect(batteryPct(4200)).toBe(100);
    expect(batteryPct(2900)).toBe(0);
    expect(batteryPct(3600)).toBe(50);
  });
});

describe('model response schema', () => {
  it('rejects crossed quantiles', () => {
    const bad = {
      requestId: 'x',
      modelVersion: 'm',
      nodes: [
        {
          nodeId: 'N-001',
          horizons: [{ h: 1, p10_mm: 5, p50_mm: 4, p90_mm: 6 }],
          speed_mmPerDay: 1,
          strainRate_perDay: null,
          tCrit_h: null,
        },
      ],
      zones: [],
    };
    expect(modelResponseSchema.safeParse(bad).success).toBe(false);
  });
});
