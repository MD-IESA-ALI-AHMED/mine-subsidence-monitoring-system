import { Color } from 'three';

const ARC_SEGMENTS = 12;
const ARC_LIFT = 0.12; // apex height as a share of the span

/** Straight segments (ESP-NOW) or low arcs (mesh) between node tops, coloured by link quality. */
export function linkSegments(links, topOf, { arc = false, colourOf, bg }) {
  const pos = [];
  const cols = [];
  const c = new Color();
  const back = new Color(bg);
  for (const l of links) {
    const a = topOf(l.from);
    const b = topOf(l.to);
    if (!a || !b) continue;
    // Weak links fade toward the background: quality 1 = full colour, 0 = half strength.
    c.set(colourOf(l)).lerp(back, 0.5 * (1 - (l.quality_0to1 ?? 1)));
    const push = (p, q) => {
      pos.push(...p, ...q);
      cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
    };
    if (!arc) {
      push(a, b);
      continue;
    }
    const span = Math.hypot(b[0] - a[0], b[2] - a[2]);
    let prev = a;
    for (let k = 1; k <= ARC_SEGMENTS; k += 1) {
      const t = k / ARC_SEGMENTS;
      const p = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t + 4 * t * (1 - t) * span * ARC_LIFT,
        a[2] + (b[2] - a[2]) * t,
      ];
      push(prev, p);
      prev = p;
    }
  }
  return { positions: new Float32Array(pos), colors: new Float32Array(cols) };
}

/** Path from a node to the root through the current mesh links: [nodeId, relay, …, root]. */
export function pathToRoot(nodeId, links) {
  const primary = links.find((l) => l.kind === 'espnow_primary' && l.from === nodeId)?.to;
  const parent = new Map(links.filter((l) => l.kind === 'mesh').map((l) => [l.from, l.to]));
  const path = [nodeId];
  let cur = primary ?? (parent.has(nodeId) ? parent.get(nodeId) : null);
  const seen = new Set(path);
  while (cur && !seen.has(cur)) {
    path.push(cur);
    seen.add(cur);
    cur = parent.get(cur);
  }
  return path;
}
