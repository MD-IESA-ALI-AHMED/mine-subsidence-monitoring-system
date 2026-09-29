import { describe, expect, it } from 'vitest';
import { meshTreeLayout } from './meshTreeLayout.js';

const n = (id, type, x, status = 'online') => ({ id, type, x, status });
const nodes = [
  n('R-01', 'root', 270),
  n('R-02', 'relay', 200),
  n('R-03', 'relay', 120),
  n('R-04', 'relay', 50, 'offline'),
  n('N-001', 'sensor', 100),
  n('N-002', 'sensor', 110),
];
const links = [
  { from: 'R-02', to: 'R-01', kind: 'mesh' },
  { from: 'R-03', to: 'R-02', kind: 'mesh' },
  { from: 'N-001', to: 'R-03', kind: 'espnow_primary' },
  { from: 'N-002', to: 'R-03', kind: 'espnow_primary' },
];

describe('mesh tree layout', () => {
  it('puts the root on top and relays in rows by hop count', () => {
    const t = meshTreeLayout(nodes, links);
    const byId = Object.fromEntries(t.relays.map((r) => [r.id, r]));
    expect(byId['R-01'].layer).toBe(1);
    expect(byId['R-02'].layer).toBe(2);
    expect(byId['R-03'].layer).toBe(3);
    expect(byId['R-01'].y).toBeLessThan(byId['R-03'].y);
    expect(t.edges).toHaveLength(2);
  });

  it('counts the units reporting to each relay and lists relays outside the tree', () => {
    const t = meshTreeLayout(nodes, links);
    expect(t.relays.find((r) => r.id === 'R-03').count).toBe(2);
    expect(t.detached).toEqual(['R-04']);
  });
});
