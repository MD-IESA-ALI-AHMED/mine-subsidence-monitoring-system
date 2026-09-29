// Site coordinates (x east, y north, metres) to scene coordinates (three.js: y up).
// Scene origin is the centre of the site at the base ground level; 1 scene unit = 1 m.
// Heights: ground elevation above base (true scale) minus sinking × vertical exaggeration.

export const DEPTH_SCALE = 0.4; // underground depths are compressed so panels stay in view
export const NODE_SCALE = 3; // node models are drawn larger than life to be visible from 300 m

export function frameOf(site) {
  const { xMin, xMax, yMin, yMax } = site.extent;
  return {
    cx: (xMin + xMax) / 2,
    cy: (yMin + yMax) / 2,
    width: xMax - xMin,
    depth: yMax - yMin,
    base: site.ground?.base_m ?? 0,
  };
}

export const toScene = (frame, x, y, h = 0) => [x - frame.cx, h, -(y - frame.cy)];
export const fromScene = (frame, sx, sz) => [sx + frame.cx, frame.cy - sz];

export function decodeFloat32(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/** Decoded terrain grid: { nx, ny, res, xMin, yMin, elevation, sinking, maxSinking_mm, faces }. */
export function decodeTerrain(t) {
  return { ...t, elevation: decodeFloat32(t.elevation), sinking: decodeFloat32(t.sinking) };
}

/** Bilinear sample of a row-major grid at site coordinates. */
export function sampleGrid(grid, values, x, y) {
  const fx = Math.max(0, Math.min(grid.nx - 1.0001, (x - grid.xMin) / grid.res));
  const fy = Math.max(0, Math.min(grid.ny - 1.0001, (y - grid.yMin) / grid.res));
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const tx = fx - i;
  const ty = fy - j;
  const v = (a, b) => values[b * grid.nx + a];
  return (
    v(i, j) * (1 - tx) * (1 - ty) +
    v(i + 1, j) * tx * (1 - ty) +
    v(i, j + 1) * (1 - tx) * ty +
    v(i + 1, j + 1) * tx * ty
  );
}

/** Scene height of the (sunken, exaggerated) ground surface at a site point. */
export function surfaceHeight(grid, frame, exaggeration, x, y) {
  const elev = sampleGrid(grid, grid.elevation, x, y) - frame.base;
  const sink = sampleGrid(grid, grid.sinking, x, y);
  return elev - (sink / 1000) * exaggeration;
}

export const vertexHeight = (grid, frame, exaggeration, k) =>
  grid.elevation[k] - frame.base - (grid.sinking[k] / 1000) * exaggeration;
