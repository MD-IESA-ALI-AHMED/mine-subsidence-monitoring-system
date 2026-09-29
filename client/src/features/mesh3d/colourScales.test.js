import { converter } from 'culori';
import { describe, expect, it } from 'vitest';
import { colourFor, scaleSwatches, sinkingT, speedT } from './colourScales.js';

const toOklch = converter('oklch');

describe('colour scales', () => {
  it('maps sinking on a log scale from 0.5 to 1000 mm', () => {
    expect(sinkingT(0.2)).toBe(0);
    expect(sinkingT(1000)).toBe(1);
    // 44 mm over old workings and 700 mm over the longwall are both clearly visible.
    expect(sinkingT(44)).toBeGreaterThan(0.55);
    expect(sinkingT(700)).toBeGreaterThan(0.9);
    expect(sinkingT(10)).toBeCloseTo(0.394, 2);
  });

  it('puts zero speed in the middle of the diverging scale', () => {
    expect(speedT(0)).toBe(0.5);
    expect(speedT(-5)).toBeLessThan(0.5);
    expect(speedT(5)).toBeGreaterThan(0.5);
  });

  it('starts and ends on the specified stops', () => {
    expect(colourFor('sinking', 0, 'dark').toLowerCase()).toBe('#24323a');
    expect(colourFor('sinking', 1000, 'dark').toLowerCase()).toBe('#c53a2e');
    expect(colourFor('sinking', 1000, 'light').toLowerCase()).toBe('#a5281e');
  });

  it('never produces purple, violet, indigo, magenta or pink', () => {
    for (const metric of ['sinking', 'speed', 'battery', 'signal']) {
      for (const theme of ['dark', 'light']) {
        for (const hex of scaleSwatches(metric, theme, 64)) {
          const { h, c } = toOklch(hex);
          // Chromatic colours only: near-grey has no meaningful hue.
          if (c > 0.03) expect(h < 250 || h > 340, `${metric}/${theme} ${hex} hue ${h}`).toBe(true);
        }
      }
    }
  });

  it('gives mesh layers distinct categorical colours', () => {
    const layers = [1, 2, 3, 4].map((l) => colourFor('meshLayer', l, 'dark'));
    expect(new Set(layers).size).toBe(4);
  });
});
