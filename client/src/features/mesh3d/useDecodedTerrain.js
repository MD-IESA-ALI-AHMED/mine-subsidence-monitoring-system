import { useMemo } from 'react';
import { useTerrain } from '../../services/queries.js';
import { decodeTerrain } from './sceneMath.js';

/** Terrain grid for the current time, decoded once per response. */
export function useDecodedTerrain(at, res = 4) {
  const q = useTerrain(at, res);
  const grid = useMemo(() => (q.data ? decodeTerrain(q.data) : null), [q.data]);
  return { ...q, grid };
}
