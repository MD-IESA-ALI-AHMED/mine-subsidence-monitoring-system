import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Color, Object3D } from 'three';
import { NODE_SCALE } from './sceneMath.js';

const tmp = new Object3D();
const col = new Color();

/**
 * One InstancedMesh for one part (e.g. every sensor head). items: [{ id, base: [x,y,z], colour,
 * scale }]. Colour and matrix per instance; hover/select scaling is done by the caller via `scale`.
 */
export function NodePart({ part, items, neutral, rim, hollow = false, onPick, onHover, onLeave }) {
  const ref = useRef();
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => part.geometry(), [part]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      const s = NODE_SCALE * (it.scale ?? 1);
      tmp.position.set(it.base[0], it.base[1] + part.y * s, it.base[2]);
      tmp.scale.setScalar(s);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      col.set(part.metric ? it.colour : part.tone === 'rim' ? rim : neutral);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [items, part, neutral, rim, invalidate]);

  if (!items.length) return null;
  const pick = onPick && ((e) => (e.stopPropagation(), onPick(items[e.instanceId]?.id)));
  const hover = onHover && ((e) => (e.stopPropagation(), onHover(items[e.instanceId]?.id)));
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, undefined, items.length]}
      castShadow={false}
      onClick={pick}
      onPointerMove={hover}
      onPointerOut={onLeave}
    >
      <meshStandardMaterial
        roughness={0.7}
        metalness={0}
        wireframe={hollow}
        transparent={hollow}
        opacity={hollow ? 0.8 : 1}
      />
    </instancedMesh>
  );
}
