import { describe, expect, it } from 'vitest';
import { ease, viewPose } from './cameraMath.js';

const frame = { width: 320, depth: 220 };

describe('camera maths', () => {
  it('eases along cubic-bezier(0.2, 0, 0, 1)', () => {
    expect(ease(0)).toBeCloseTo(0);
    expect(ease(1)).toBeCloseTo(1);
    expect(ease(0.5)).toBeGreaterThan(0.8); // fast start, gentle landing
  });

  it('looks straight down in the top view', () => {
    const { position } = viewPose('top', frame);
    expect(position[0]).toBeCloseTo(0);
    expect(position[1]).toBeGreaterThan(200);
  });

  it('puts the oblique camera 35° above the horizon, south of the site, far enough to fit it', () => {
    const { position } = viewPose('oblique', frame, [0, 0, 0], { fov: 35, aspect: 1 });
    const horizontal = Math.hypot(position[0], position[2]);
    expect((Math.atan2(position[1], horizontal) * 180) / Math.PI).toBeCloseTo(35, 0);
    expect(position[2]).toBeGreaterThan(0); // +z is south
    const dist = Math.hypot(...position);
    const halfWidthVisible = dist * Math.tan((17.5 * Math.PI) / 180);
    expect(halfWidthVisible).toBeGreaterThan(frame.width / 2);
  });
});
