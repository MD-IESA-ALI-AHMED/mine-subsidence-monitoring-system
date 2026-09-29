import { contours } from 'd3-contour';

/**
 * Contour lines of a regular grid as polylines in grid coordinates.
 * values: Float32Array (row-major, nx × ny); thresholds: levels to trace.
 * Returns [{ level, rings: [[[x, y], …], …] }].
 */
export function contourLines(values, nx, ny, thresholds) {
  const gen = contours().size([nx, ny]).thresholds(thresholds).smooth(true);
  return gen(Array.from(values)).map((c) => ({
    level: c.value,
    rings: c.coordinates.flatMap((polygon) => polygon),
  }));
}

/**
 * A stand-in surface for the sign-in page drawing (no site data before sign-in): gently uneven
 * ground with the longwall trough over P1. Same shape as the real site, not real data.
 */
export function sketchSurface(nx = 81, ny = 56) {
  const values = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const x = (i / (nx - 1)) * 320;
      const y = (j / (ny - 1)) * 220;
      const ground = 0.006 * x + 0.8 * Math.sin(x / 40) * Math.cos(y / 55);
      const trough = Math.exp(-(((x - 98) / 38) ** 2) - ((y - 105) / 52) ** 2);
      const workings = Math.exp(-(((x - 250) / 16) ** 2) - ((y - 185) / 14) ** 2);
      values[j * nx + i] = ground - 1.2 * trough - 0.35 * workings;
    }
  }
  return { values, nx, ny };
}
