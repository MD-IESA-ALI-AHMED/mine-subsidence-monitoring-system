import { tierRank } from '@subsidence/shared';

/** Most dangerous first: by tier, then by the shortest time to limit, then by score. */
export function sortZones(zones = []) {
  return [...zones].sort((a, b) => {
    const t = tierRank(b.severity?.tier) - tierRank(a.severity?.tier);
    if (t) return t;
    const ta = a.tCrit?.used_h ?? Infinity;
    const tb = b.tCrit?.used_h ?? Infinity;
    if (ta !== tb) return ta - tb;
    return (b.severity?.score ?? 0) - (a.severity?.score ?? 0);
  });
}

/** The zone that matters most right now, or null. */
export const highestRisk = (zones) => sortZones(zones)[0] ?? null;
