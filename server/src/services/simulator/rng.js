import seedrandom from 'seedrandom';

// All randomness goes through seeded generators. Per-sample noise is keyed by (seed, node, time),
// so any reading can be recomputed on its own and the live simulator continues the same story.

export function makeRng(...keyParts) {
  return seedrandom.alea(keyParts.join('|'));
}

export function gaussian(rng) {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const uniform = (rng, [lo, hi]) => lo + (hi - lo) * rng();

export const smoothstep = (x) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
