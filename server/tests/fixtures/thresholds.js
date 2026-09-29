import fs from 'node:fs';

/** The real site thresholds from scenarios.json, so tests exercise the tuned values. */
export const thresholds = JSON.parse(
  fs.readFileSync(new URL('../../data/dummy/scenarios.json', import.meta.url), 'utf8'),
).site.thresholds;

/** A 5 × 5 grid of nodes 20 m apart, all quiet. */
export function quietGrid() {
  const nodes = [];
  for (let j = 0; j < 5; j += 1) {
    for (let i = 0; i < 5; i += 1) {
      nodes.push({
        id: `N-${j}${i}`,
        x: i * 20,
        y: j * 20,
        status: 'online',
        change24h_mm: 0.3,
        speed_mmPerDay: 0.2,
      });
    }
  }
  return nodes;
}
