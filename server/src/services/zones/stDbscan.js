import { dist } from '../field/geometry.js';

/**
 * ST-DBSCAN: two points are neighbours when they are within eps1 metres AND their feature vectors
 * are within eps2 (Euclidean). A core point has at least minPts neighbours, itself included.
 * points: [{ id, x, y, f: number[] }]. Returns clusters as arrays of ids (noise is dropped).
 */
export function stDbscan(points, { eps1, eps2, minPts }) {
  const featureDist = (a, b) => Math.sqrt(a.f.reduce((s, v, i) => s + (v - b.f[i]) ** 2, 0));
  const neighbours = points.map((p) =>
    points.filter((q) => dist(p.x, p.y, q.x, q.y) <= eps1 && featureDist(p, q) <= eps2),
  );

  const label = new Map();
  const clusters = [];
  points.forEach((p, i) => {
    if (label.has(p.id) || neighbours[i].length < minPts) return;
    const cluster = [];
    const queue = [i];
    label.set(p.id, clusters.length);
    while (queue.length) {
      const j = queue.shift();
      cluster.push(points[j].id);
      if (neighbours[j].length < minPts) continue; // border point: joins but does not expand
      for (const q of neighbours[j]) {
        if (label.has(q.id)) continue;
        label.set(q.id, clusters.length);
        queue.push(points.indexOf(q));
      }
    }
    clusters.push(cluster);
  });
  return clusters;
}

/** Signed log scaling so small and large movements both separate well: sign(v)·ln(1+|v|/s). */
export const logFeature = (v, scale) => Math.sign(v ?? 0) * Math.log1p(Math.abs(v ?? 0) / scale);

export function jaccard(a, b) {
  const A = new Set(a);
  const inter = b.filter((x) => A.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
}
