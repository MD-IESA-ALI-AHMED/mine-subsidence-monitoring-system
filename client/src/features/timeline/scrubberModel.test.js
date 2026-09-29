import { describe, expect, it } from 'vitest';
import { scrubberMarks, timeAtFraction } from './scrubberModel.js';

const start = Date.UTC(2026, 8, 21, 18, 30);
const end = start + 7 * 86_400_000;
const at = (d, h = 0) => new Date(start + (d * 24 + h) * 3_600_000).toISOString();

describe('scrubber marks', () => {
  it('places blasts, zone alerts and degraded bands along the track', () => {
    const m = scrubberMarks({
      start,
      end,
      events: [
        { _id: 'b1', kind: 'blast', ts: at(3.5) },
        { _id: 't1', kind: 'vehicle_transient', ts: at(1) },
      ],
      alerts: [
        { _id: 'a1', kind: 'zone', tier: 'warning', createdAt: at(7), title: 'Z-OW1 warning' },
        {
          _id: 'a2',
          kind: 'inspect_node',
          tier: 'watch',
          createdAt: at(2),
          title: 'Inspect N-001',
        },
      ],
      meshStates: [
        { ts: at(0), degraded: false },
        { ts: at(5, 10), degraded: true, reason: 'root lost, R-02 now root' },
        { ts: at(5, 13), degraded: false },
      ],
    });
    expect(m.blasts).toEqual([{ id: 'b1', x: 0.5 }]);
    expect(m.alerts).toHaveLength(1);
    expect(m.alerts[0]).toMatchObject({ tier: 'warning', x: 1 });
    expect(m.degraded).toHaveLength(1);
    expect(m.degraded[0].x1 - m.degraded[0].x0).toBeCloseTo(3 / (7 * 24));
  });

  it('snaps pointer positions to 10 minutes within the range', () => {
    expect(timeAtFraction(-1, start, end)).toBe(start);
    expect(timeAtFraction(2, start, end)).toBe(end);
    expect(timeAtFraction(0.5, start, end) % 600_000).toBe(0);
  });
});
