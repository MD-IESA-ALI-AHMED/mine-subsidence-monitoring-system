import { dist } from '../field/geometry.js';

/**
 * Builds the ESP-WIFI-MESH tree: breadth-first from the root, each relay attaches to the nearest
 * relay in the previous layer within range. Returns Map(id -> { parentId, layer }).
 * Relays in `down` are left out; relays that cannot reach the tree get layer null (unreachable).
 */
export function buildMeshTree(relays, rootId, rangeM, down = new Set()) {
  const up = relays.filter((r) => !down.has(r.id));
  const tree = new Map(up.map((r) => [r.id, { parentId: null, layer: null }]));
  if (!tree.has(rootId)) return tree;
  tree.set(rootId, { parentId: null, layer: 1 });

  let frontier = up.filter((r) => r.id === rootId);
  for (let layer = 2; frontier.length; layer += 1) {
    const next = [];
    for (const r of up) {
      if (tree.get(r.id).layer != null) continue;
      let best = null;
      for (const p of frontier) {
        const d = dist(r.x, r.y, p.x, p.y);
        if (d <= rangeM && (!best || d < best.d)) best = { id: p.id, d };
      }
      if (best) next.push({ r, parentId: best.id });
    }
    for (const { r, parentId } of next) tree.set(r.id, { parentId, layer });
    frontier = next.map((n) => n.r);
  }
  return tree;
}

/** Nearest and second-nearest relay for a point. */
export function nearestRelays(x, y, relays, down = new Set()) {
  return relays
    .filter((r) => !down.has(r.id))
    .map((r) => ({ id: r.id, d: dist(x, y, r.x, r.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2);
}

/** Log-distance path loss. */
export function rssiAt(distanceM, { p0_dBm, exponent }) {
  return p0_dBm - 10 * exponent * Math.log10(Math.max(1, distanceM));
}

/** 0..1 link quality from RSSI: -95 dBm or worse is 0, -60 dBm or better is 1. */
export function linkQuality(rssi) {
  return Math.max(0, Math.min(1, (rssi + 95) / 35));
}

/** Path from a node to the root, e.g. ['N-041', 'R-06', 'R-03', 'R-01']. */
export function meshPath(nodeId, primaryRelayId, parentOf) {
  const path = [nodeId];
  let cur = primaryRelayId;
  const seen = new Set();
  while (cur && !seen.has(cur)) {
    path.push(cur);
    seen.add(cur);
    cur = parentOf(cur);
  }
  return path;
}
