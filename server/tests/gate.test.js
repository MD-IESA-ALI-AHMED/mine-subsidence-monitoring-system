import { describe, expect, it } from 'vitest';
import { evaluateGate } from '../src/services/gate/gate.js';
import { exclusions } from '../src/services/pipeline/loadInputs.js';
import { quietGrid, thresholds as th } from './fixtures/thresholds.js';

const T0 = new Date('2026-10-01T00:00:00Z');
const at = (min) => new Date(T0.getTime() + min * 60000);
const move = (nodes, ids, change, speed = 0) =>
  nodes.map((n) =>
    ids.includes(n.id) ? { ...n, change24h_mm: change, speed_mmPerDay: speed } : n,
  );

describe('corroborated gate', () => {
  it('stays closed when nothing moves', () => {
    const g = evaluateGate(quietGrid(), th, {}, T0);
    expect(g.open).toBe(false);
    expect(g.changed).toBe(false);
  });

  it('ignores a single noisy node, however large, but reports it as Zmax', () => {
    const nodes = move(quietGrid(), ['N-22'], 40, 30);
    const g = evaluateGate(nodes, th, {}, T0);
    expect(g.open).toBe(false);
    expect(g.zmaxNodeId).toBe('N-22');
    expect(g.zmax_mm).toBe(40);
  });

  it('opens when enough neighbours move together', () => {
    const nodes = move(quietGrid(), ['N-21', 'N-22', 'N-23'], th.gateOn_mm + 1);
    const g = evaluateGate(nodes, th, {}, T0);
    expect(g.open).toBe(true);
    expect(g.changed).toBe(true);
    expect(g.triggered).toEqual(expect.arrayContaining(['N-21', 'N-22', 'N-23']));
  });

  it('does not open for the same number of nodes spread far apart', () => {
    const nodes = move(quietGrid(), ['N-00', 'N-04', 'N-44'], th.gateOn_mm + 1);
    expect(evaluateGate(nodes, th, {}, T0).open).toBe(false);
  });

  it('opens for a node that went silent after rising', () => {
    const nodes = quietGrid().map((n) =>
      n.id === 'N-11' ? { ...n, status: 'silent_after_rise' } : n,
    );
    const g = evaluateGate(nodes, th, {}, T0);
    expect(g.open).toBe(true);
    expect(g.reason).toMatch(/N-11 silent after rising/);
  });

  it('holds between the ON and OFF levels, then closes only after holdMinutes of quiet', () => {
    const moving = move(quietGrid(), ['N-21', 'N-22', 'N-23'], th.gateOn_mm + 1);
    let g = evaluateGate(moving, th, {}, at(0));
    expect(g.open).toBe(true);

    // Between OFF and ON: still open, no countdown.
    const between = move(quietGrid(), ['N-21', 'N-22', 'N-23'], (th.gateOn_mm + th.gateOff_mm) / 2);
    g = evaluateGate(between, th, g, at(10));
    expect(g.open).toBe(true);
    expect(g.belowSince).toBeNull();

    // Below OFF: countdown starts, gate stays open until holdMinutes have passed.
    g = evaluateGate(quietGrid(), th, g, at(20));
    expect(g.open).toBe(true);
    expect(g.belowSince).toEqual(at(20));
    g = evaluateGate(quietGrid(), th, g, at(20 + th.holdMinutes - 1));
    expect(g.open).toBe(true);

    // A brief return above OFF resets the countdown.
    const blip = evaluateGate(between, th, g, at(20 + th.holdMinutes - 1));
    expect(blip.belowSince).toBeNull();

    g = evaluateGate(quietGrid(), th, g, at(20 + th.holdMinutes));
    expect(g.open).toBe(false);
    expect(g.changed).toBe(true);
  });
});

describe('gate exclusions', () => {
  const now = new Date('2026-10-01T12:00:00Z');

  it('leaves out nodes caught by a haul truck in the last 30 minutes', () => {
    const events = [
      { kind: 'vehicle_transient', ts: new Date(now - 10 * 60000), nodeIds: ['N-004'] },
      { kind: 'vehicle_transient', ts: new Date(now - 90 * 60000), nodeIds: ['N-005'] },
      { kind: 'blast', ts: new Date(now - 5 * 60000), nodeIds: ['N-006'] },
    ];
    const out = exclusions([], events, now);
    expect([...out]).toEqual(['N-004']);
  });

  it('leaves out a node re-baselined after a seating shift in the last 24 h', () => {
    const nodes = [
      { _id: 'N-031', rebaselinedAt: new Date(now - 3 * 3600_000) },
      { _id: 'N-032', rebaselinedAt: new Date(now - 30 * 3600_000) },
    ];
    expect([...exclusions(nodes, [], now)]).toEqual(['N-031']);
  });

  it('a truck spike on excluded nodes cannot open the gate', () => {
    const shaken = move(quietGrid(), ['N-21', 'N-22', 'N-23'], th.gateOn_mm + 5, 20);
    const excluded = new Set(['N-21', 'N-22', 'N-23']);
    const g = evaluateGate(
      shaken.filter((n) => !excluded.has(n.id)),
      th,
      {},
      now,
    );
    expect(g.open).toBe(false);
  });
});
