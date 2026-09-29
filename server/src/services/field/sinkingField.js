import { groundZ } from './geometry.js';
import { expectedAt, expectedGrid } from './expected.js';

// Sinking field on a regular grid for the 3D terrain.
// field = Knothe prediction + a smooth correction built from what the nodes actually measured
// (residual = measured − expected, spread with a Gaussian kernel that fades back to zero away
// from nodes). Where nothing unexpected happens it is the Knothe trough; where the ground moves
// more (or less) than predicted, the nodes pull the surface with them.

const KERNEL_M = 18;
const PRIOR_WEIGHT = 0.05;

export function gridAxes(extent, res) {
  const xs = [];
  const ys = [];
  for (let x = extent.xMin; x <= extent.xMax + 1e-9; x += res) xs.push(x);
  for (let y = extent.yMin; y <= extent.yMax + 1e-9; y += res) ys.push(y);
  return { xs, ys };
}

/**
 * points: [{ x, y, sinking_mm }] measured at time `at` (sensors and reference units).
 * Returns { nx, ny, xs, ys, elevation: Float32Array, sinking: Float32Array }.
 */
export function buildSinkingField(site, points, at, res = 4) {
  const { xs, ys } = gridAxes(site.extent, res);
  const nx = xs.length;
  const ny = ys.length;
  const sinking = expectedGrid(site, xs, ys, at);
  const elevation = new Float32Array(nx * ny);

  const residuals = points.map((p) => ({
    x: p.x,
    y: p.y,
    r: p.sinking_mm - expectedAt(site, p.x, p.y, at),
  }));
  const inv = 1 / (KERNEL_M * KERNEL_M);
  const reach2 = (3 * KERNEL_M) ** 2;

  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const k = j * nx + i;
      elevation[k] = groundZ(site.ground, xs[i], ys[j]);
      let wsum = PRIOR_WEIGHT;
      let rsum = 0;
      for (const p of residuals) {
        const d2 = (xs[i] - p.x) ** 2 + (ys[j] - p.y) ** 2;
        if (d2 > reach2) continue;
        const w = Math.exp(-d2 * inv);
        wsum += w;
        rsum += w * p.r;
      }
      sinking[k] += rsum / wsum;
    }
  }
  return { nx, ny, xs, ys, elevation, sinking };
}

export const toBase64 = (f32) =>
  Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength).toString('base64');
