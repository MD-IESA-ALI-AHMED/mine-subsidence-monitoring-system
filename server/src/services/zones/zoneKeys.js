import { centroid, dist, distToPolygonEdge, pointInPolygon } from '../field/geometry.js';
import { facePositions } from '../field/expected.js';
import { jaccard } from './stDbscan.js';

const NEAR_PANEL_M = 40;

function compass(dx, dy) {
  const ns = dy > 8 ? 'N' : dy < -8 ? 'S' : '';
  const ew = dx > 8 ? 'E' : dx < -8 ? 'W' : '';
  return ns + ew;
}

/** Reference point of a panel: the mined-out part for an advancing longwall, else its centroid. */
function panelCentre(site, panel, at) {
  const face = facePositions(site, at).find((f) => f.panelId === panel.panelId);
  if (face) return [(face.x + panel.face.start_m) / 2, (face.yMin + face.yMax) / 2];
  return centroid(panel.polygon);
}

/**
 * New zone key from where it is: Z-<panel> when it sits over a panel's centre, otherwise
 * Z-<panel>-<compass> relative to the panel's mined part (e.g. Z-P1-SE), or Z-<n> if it is
 * near no panel. Adds -2, -3 … if the key is taken.
 */
export function nameZone(site, zoneCentre, at, taken) {
  const [x, y] = zoneCentre;
  let best = null;
  for (const p of site.panels) {
    const inside = pointInPolygon(x, y, p.polygon);
    const d = inside ? 0 : distToPolygonEdge(x, y, p.polygon);
    if (d <= NEAR_PANEL_M && (!best || d < best.d)) best = { p, d, inside };
  }
  let key;
  if (!best) {
    key = 'Z-1';
  } else {
    const [cx, cy] = panelCentre(site, best.p, at);
    const dir = compass(x - cx, y - cy);
    const central = best.inside && dist(x, y, cx, cy) < 30;
    key = central || !dir ? `Z-${best.p.panelId}` : `Z-${best.p.panelId}-${dir}`;
  }
  const baseKey = key;
  for (let i = 2; taken.has(key); i += 1) key = `${baseKey}-${i}`;
  return key;
}

/**
 * Gives each new cluster the key of the previous-run zone it overlaps most (Jaccard >= 0.5),
 * so zones keep their names across runs; otherwise names it by location.
 */
export function assignKeys(clusters, prevZones, site, at) {
  const used = new Set();
  const keys = new Array(clusters.length);
  const pairs = [];
  clusters.forEach((c, i) =>
    prevZones.forEach((z) => pairs.push({ i, key: z.zoneKey, j: jaccard(c.nodeIds, z.nodeIds) })),
  );
  pairs.sort((a, b) => b.j - a.j);
  for (const { i, key, j } of pairs) {
    if (j < 0.5 || keys[i] || used.has(key)) continue;
    keys[i] = key;
    used.add(key);
  }
  clusters.forEach((c, i) => {
    if (keys[i]) return;
    // Keys of previous zones that matched nothing are free again, so a zone that reforms in
    // the same place gets its old name back instead of Z-P1-2.
    keys[i] = nameZone(site, c.centroid, at, used);
    used.add(keys[i]);
  });
  return keys;
}
