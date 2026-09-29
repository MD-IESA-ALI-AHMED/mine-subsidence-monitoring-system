import { describe, expect, it } from 'vitest';
import { HOLD_AT_S, INTRO_S, advance, meshOrder, nodeAppear, stagesAt } from './introTimeline.js';

describe('intro timeline', () => {
  it('runs the stages in the specified order', () => {
    const at = (t) => stagesAt(t);
    expect(at(0.2)).toMatchObject({ contours: 0, terrain: 0, nodes: 0, ui: 0, done: false });
    expect(at(0.75).contours).toBeCloseTo(0.5);
    expect(at(1.3).terrain).toBeCloseTo(0.5);
    expect(at(1.3).nodes).toBe(0);
    expect(at(2.25).links).toBeCloseTo(0.5);
    expect(at(2.65).camera).toBeCloseTo(0.5);
    expect(at(2.9).ui).toBeCloseTo(0.5);
    expect(at(INTRO_S)).toMatchObject({
      contours: 1,
      terrain: 1,
      nodes: 1,
      links: 1,
      camera: 1,
      ui: 1,
      done: true,
    });
  });

  it('replaces the animation with a 250 ms fade under reduced motion', () => {
    expect(stagesAt(0.125, { reduced: true })).toMatchObject({
      terrain: 0.5,
      camera: 1,
      done: false,
    });
    expect(stagesAt(0.25, { reduced: true }).done).toBe(true);
  });

  it('holds at the contour stage until the data is ready', () => {
    expect(advance(1.3, 0.5, false)).toBe(HOLD_AT_S);
    expect(advance(HOLD_AT_S, 0.5, false)).toBe(HOLD_AT_S);
    expect(advance(HOLD_AT_S, 0.5, true)).toBeCloseTo(1.9);
    expect(advance(0.5, 0.1, false)).toBeCloseTo(0.6);
  });

  it('lights the root first, then relays by layer, then their units', () => {
    const order = meshOrder([
      { id: 'N-001', type: 'sensor', parentRelayId: 'R-02', x: 0 },
      { id: 'R-02', type: 'relay', meshLayer: 2, x: 0 },
      { id: 'REF-1', type: 'reference', parentRelayId: 'R-01', x: 0 },
      { id: 'R-01', type: 'root', meshLayer: 1, x: 0 },
      { id: 'N-002', type: 'sensor', parentRelayId: 'R-01', x: 0 },
    ]);
    expect([...order.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual([
      'R-01',
      'R-02',
      'N-002',
      'N-001',
      'REF-1',
    ]);
  });

  it('staggers nodes 20 ms apart, tighter when 20 ms would overrun the 0.8 s stage', () => {
    expect(nodeAppear(1, 10, 0.02)).toBe(0); // 10 nodes: 20 ms apart
    expect(nodeAppear(0, 60, 0.25)).toBe(1);
    expect(nodeAppear(50, 60, 0.1)).toBe(0); // 60 nodes: ~9 ms apart, last starts by 0.55 s
    expect(nodeAppear(59, 60, 0.8)).toBe(1);
    expect(nodeAppear(5, 60, Infinity)).toBe(1);
  });
});
