import { describe, expect, it } from 'vitest';
import { decodeFloat32, frameOf, sampleGrid, surfaceHeight, toScene } from './sceneMath.js';

const site = { extent: { xMin: 0, xMax: 320, yMin: 0, yMax: 220 }, ground: { base_m: 180 } };

describe('scene maths', () => {
  it('puts the site centre at the origin with north toward −z', () => {
    const f = frameOf(site);
    expect(toScene(f, 160, 110, 2)).toEqual([0, 2, -0]);
    expect(toScene(f, 160, 220)[2]).toBe(-110);
  });

  it('decodes base64 Float32 arrays', () => {
    const src = new Float32Array([1.5, -2, 3.25]);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(src.buffer)));
    expect(Array.from(decodeFloat32(b64))).toEqual([1.5, -2, 3.25]);
  });

  it('samples the grid bilinearly and sinks the surface by sinking × exaggeration', () => {
    const grid = {
      nx: 2,
      ny: 2,
      res: 10,
      xMin: 0,
      yMin: 0,
      elevation: new Float32Array([180, 182, 180, 182]),
      sinking: new Float32Array([0, 100, 0, 100]),
    };
    expect(sampleGrid(grid, grid.elevation, 5, 5)).toBeCloseTo(181);
    // 50 mm × 300 = 15 m down from 1 m above base.
    expect(surfaceHeight(grid, frameOf(site), 300, 5, 5)).toBeCloseTo(1 - 15);
  });
});
