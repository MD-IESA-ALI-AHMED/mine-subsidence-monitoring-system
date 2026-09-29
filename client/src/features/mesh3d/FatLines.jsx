import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

/**
 * Merged screen-space-width line segments (one draw call).
 * positions: flat [x1,y1,z1, x2,y2,z2, …] pairs; colors: same length (linear RGB) or omit for `color`.
 * `reveal` (0..1) draws only the first share of segments, for the opening animation.
 */
export function FatLines({
  positions,
  colors,
  color = '#ffffff',
  width = 1,
  opacity = 1,
  dashed = false,
  dashSize = 3,
  gapSize = 2,
  reveal = 1,
  renderOrder = 0,
  depthTest = true,
}) {
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(() => new LineMaterial({ transparent: true, worldUnits: false }), []);
  const line = useMemo(() => new LineSegments2(new LineSegmentsGeometry(), material), [material]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      material.dispose();
    },
    [line, material],
  );

  useEffect(() => {
    const old = line.geometry;
    const geom = new LineSegmentsGeometry();
    if (positions?.length) {
      geom.setPositions(positions);
      if (colors) geom.setColors(colors);
    }
    line.geometry = geom;
    if (dashed && positions?.length) line.computeLineDistances();
    old.dispose();
    invalidate();
  }, [line, positions, colors, dashed, invalidate]);

  useEffect(() => {
    material.color.set(colors ? '#ffffff' : color);
    material.vertexColors = Boolean(colors);
    material.linewidth = width;
    material.opacity = opacity;
    material.dashed = dashed;
    material.dashSize = dashSize;
    material.gapSize = gapSize;
    material.depthTest = depthTest;
    material.needsUpdate = true;
    invalidate();
  }, [material, color, colors, width, opacity, dashed, dashSize, gapSize, depthTest, invalidate]);

  useEffect(() => {
    const segments = positions ? positions.length / 6 : 0;
    line.geometry.instanceCount = Math.round(segments * Math.max(0, Math.min(1, reveal)));
    invalidate();
  }, [line, positions, reveal, invalidate]);

  line.renderOrder = renderOrder;
  return <primitive object={line} />;
}
