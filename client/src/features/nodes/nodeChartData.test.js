import { describe, expect, it } from 'vitest';
import { buildNodeChartData } from './nodeChartData.js';

const series = {
  t: [0, 600_000, 1_200_000],
  values: {
    sinking_mm: [1, 2, 3],
    tiltX_urad: [1000, 1100, null],
    tiltY_urad: [0, 0, 0],
    temp_C: [30, 31, 32],
  },
};

describe('node chart data', () => {
  it('aligns readings on one x axis in seconds and converts tilt to mm/m', () => {
    const d = buildNodeChartData(series, null);
    expect(d.x).toEqual([0, 600, 1200]);
    expect(d.sinking).toEqual([1, 2, 3]);
    expect(d.tiltX).toEqual([1, 1.1, null]);
    expect(d.p50.every((v) => v == null)).toBe(true);
  });

  it('adds forecast points after now up to the chosen horizon', () => {
    const forecast = {
      createdAt: new Date(1_200_000).toISOString(),
      current_mm: 3,
      horizons: [
        { h: 1, p10_mm: 3.1, p50_mm: 3.5, p90_mm: 4 },
        { h: 72, p10_mm: 5, p50_mm: 9, p90_mm: 14 },
      ],
    };
    const d = buildNodeChartData(series, forecast);
    expect(d.x.at(-1)).toBe(1200 + 3600); // 72 h horizon is left out
    expect(d.p50.at(-1)).toBe(3.5);
    expect(d.p50[2]).toBe(3); // the band starts at the current value
    expect(d.sinking.at(-1)).toBeNull();
  });

  it('labels events and leaves out routine truck passes', () => {
    const d = buildNodeChartData(series, null, [
      { kind: 'blast', ts: new Date(600_000).toISOString() },
      { kind: 'vehicle_transient', ts: new Date(0).toISOString() },
    ]);
    expect(d.events).toEqual([{ t: 600, label: 'Blast' }]);
  });
});
