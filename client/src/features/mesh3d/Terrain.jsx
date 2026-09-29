import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color } from 'three';
import { useUiStore } from '../../store/uiStore.js';
import { colourFor } from './colourScales.js';
import { vertexHeight } from './sceneMath.js';
import { useSceneModel } from './sceneContext.js';

/** Index buffer for an nx × ny vertex grid (two upward-facing triangles per cell). */
function gridIndex(nx, ny) {
  const idx = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let k = 0;
  for (let j = 0; j < ny - 1; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      idx.set([a, b, c, b, d, c], k);
      k += 6;
    }
  }
  return idx;
}

/**
 * The ground as one mesh: height = elevation + sinking × exaggeration, colour = sinking scale
 * (or a flat tone with "Surface" off). The geometry is built once per grid size; heights and
 * colours are updated in place.
 */
export function Terrain({ opacity = 1 }) {
  const { grid, frame, exaggeration, colours } = useSceneModel();
  const surface = useUiStore((s) => s.layers.surface);
  const invalidate = useThree((s) => s.invalidate);
  const matRef = useRef();
  const { nx, ny } = grid;

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(nx * ny * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(nx * ny * 3), 3));
    g.setIndex(new BufferAttribute(gridIndex(nx, ny), 1));
    return g;
  }, [nx, ny]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const pos = geometry.attributes.position.array;
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        const k = j * nx + i;
        pos[k * 3] = grid.xMin + i * grid.res - frame.cx;
        pos[k * 3 + 1] = vertexHeight(grid, frame, exaggeration, k);
        pos[k * 3 + 2] = -(grid.yMin + j * grid.res - frame.cy);
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    invalidate();
  }, [geometry, grid, frame, exaggeration, nx, ny, invalidate]);

  useEffect(() => {
    const col = geometry.attributes.color.array;
    const c = new Color();
    const flat = new Color(colours.surface2);
    for (let k = 0; k < nx * ny; k += 1) {
      if (surface) c.set(colourFor('sinking', grid.sinking[k], colours.theme));
      else c.copy(flat);
      col.set([c.r, c.g, c.b], k * 3);
    }
    geometry.attributes.color.needsUpdate = true;
    invalidate();
  }, [geometry, grid, surface, colours, nx, ny, invalidate]);

  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.opacity = opacity;
    matRef.current.transparent = opacity < 1;
    invalidate();
  }, [opacity, invalidate]);

  return (
    <mesh geometry={geometry} receiveShadow name="terrain">
      <meshStandardMaterial ref={matRef} vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}
