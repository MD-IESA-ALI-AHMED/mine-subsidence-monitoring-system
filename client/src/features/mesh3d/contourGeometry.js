import { contours } from 'd3-contour';
import { Color } from 'three';

/**
 * Contour line segments of a terrain grid, draped on the surface.
 * values: grid values to contour; levels: thresholds; place(x, y) -> [sx, sy, sz] for a site point.
 * Returns { positions: Float32Array, levelOfSegment: number[], distance: number[] } where
 * `distance` is each segment's distance from `origin` (for the drawing-in animation).
 */
export function contourSegments(grid, values, levels, place, origin) {
  if (!levels.length) return { positions: new Float32Array(0), levelOfSegment: [], distance: [] };
  const gen = contours().size([grid.nx, grid.ny]).thresholds(levels).smooth(true);
  const pts = [];
  const lv = [];
  const dist = [];
  // With smoothing, grid sample i sits at contour coordinate i + 0.5.
  const toSite = ([cx, cy]) => [
    grid.xMin + Math.max(0, Math.min(grid.nx - 1, cx - 0.5)) * grid.res,
    grid.yMin + Math.max(0, Math.min(grid.ny - 1, cy - 0.5)) * grid.res,
  ];
  const onBorder = ([cx, cy]) =>
    cx <= 0.5 || cy <= 0.5 || cx >= grid.nx - 0.5 || cy >= grid.ny - 0.5;

  for (const c of gen(Array.from(values))) {
    for (const polygon of c.coordinates) {
      for (const ring of polygon) {
        for (let k = 1; k < ring.length; k += 1) {
          const a = ring[k - 1];
          const b = ring[k];
          if (onBorder(a) && onBorder(b)) continue; // closing edge along the grid border
          const sa = toSite(a);
          const sb = toSite(b);
          pts.push(...place(sa[0], sa[1]), ...place(sb[0], sb[1]));
          lv.push(c.value);
          if (origin)
            dist.push(Math.hypot((sa[0] + sb[0]) / 2 - origin[0], (sa[1] + sb[1]) / 2 - origin[1]));
        }
      }
    }
  }
  return { positions: new Float32Array(pts), levelOfSegment: lv, distance: dist };
}

/** Reorders segments nearest-first, so revealing the first n draws contours outward. */
export function sortByDistance({ positions, levelOfSegment, distance }) {
  const order = distance.map((d, i) => [d, i]).sort((p, q) => p[0] - q[0]);
  const out = new Float32Array(positions.length);
  const levels = [];
  order.forEach(([, i], n) => {
    out.set(positions.subarray(i * 6, i * 6 + 6), n * 6);
    levels.push(levelOfSegment[i]);
  });
  return { positions: out, levelOfSegment: levels };
}

/** Per-vertex linear-RGB colours for segments from a level -> hex function. */
export function segmentColours(levelOfSegment, colourOfLevel) {
  const out = new Float32Array(levelOfSegment.length * 6);
  const c = new Color();
  levelOfSegment.forEach((level, i) => {
    c.set(colourOfLevel(level));
    out.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
  });
  return out;
}

export const GROUND_STEP_M = 1;
export const SINKING_LEVELS_MM = [5, 10, 20, 50, 100, 200, 500];

export function groundLevels(elevation) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of elevation) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const out = [];
  for (let v = Math.ceil(lo / GROUND_STEP_M) * GROUND_STEP_M; v <= hi; v += GROUND_STEP_M)
    out.push(v);
  return out;
}
