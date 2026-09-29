import { useMemo } from 'react';
import { colourFor } from './colourScales.js';
import {
  SINKING_LEVELS_MM,
  contourSegments,
  groundLevels,
  segmentColours,
  sortByDistance,
} from './contourGeometry.js';
import { FatLines } from './FatLines.jsx';
import { useSceneModel } from './sceneContext.js';

const LIFT_M = 0.05; // lines float just above the surface

/**
 * Ground contours every 1 m and sinking contours at 5–500 mm, draped on the sunken surface.
 * `reveal` 0..1 draws them outward from the centre of the mined area (opening animation).
 */
export function Contours({ reveal = 1 }) {
  const { grid, place, colours, origin } = useSceneModel();

  const ground = useMemo(() => {
    const lift = (x, y) => place(x, y, LIFT_M);
    return sortByDistance(
      contourSegments(grid, grid.elevation, groundLevels(grid.elevation), lift, origin),
    );
  }, [grid, place, origin]);

  const sinking = useMemo(() => {
    const lift = (x, y) => place(x, y, LIFT_M * 2);
    const levels = SINKING_LEVELS_MM.filter((l) => l < (grid.maxSinking_mm ?? Infinity));
    const segs = sortByDistance(contourSegments(grid, grid.sinking, levels, lift, origin));
    return {
      ...segs,
      colors: segmentColours(segs.levelOfSegment, (l) =>
        colourFor('sinking', l * 1.6, colours.theme),
      ),
    };
  }, [grid, place, origin, colours.theme]);

  return (
    <group name="contours">
      <FatLines
        positions={ground.positions}
        color={colours.lineStrong}
        width={1}
        opacity={0.7}
        reveal={reveal}
      />
      <FatLines
        positions={sinking.positions}
        colors={sinking.colors}
        width={1.5}
        opacity={0.95}
        reveal={reveal}
      />
    </group>
  );
}
