import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Object3D, SphereGeometry } from 'three';
import { useLiveStore } from '../../store/liveStore.js';
import { pathToRoot } from './linkGeometry.js';
import { useSceneModel } from './sceneContext.js';

const HOP_MS = 300;
const MAX_ACTIVE = 40;
const tmp = new Object3D();

/**
 * When readings arrive, a small dot travels from each reporting sensor to its relay and then hop by
 * hop to the root, 300 ms per hop. At most 40 at once. Shows the mesh working without clutter.
 */
export function Packets({ links, topOf }) {
  const { colours } = useSceneModel();
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useRef();
  const active = useRef([]);
  const geometry = useMemo(() => new SphereGeometry(0.6, 8, 6), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const lastWall = useRef(Date.now());

  useEffect(
    () =>
      useLiveStore.subscribe((state, prev) => {
        if (state.reports === prev.reports || !links) return;
        const fresh = state.reports.filter((r) => r.wall > lastWall.current);
        lastWall.current = state.reports.at(-1)?.wall ?? lastWall.current;
        const now = performance.now();
        for (const r of fresh) {
          if (active.current.length >= MAX_ACTIVE) break;
          const points = pathToRoot(r.nodeId, links).map(topOf).filter(Boolean);
          if (points.length >= 2) active.current.push({ points, start: now + Math.random() * 400 });
        }
        invalidate();
      }),
    [links, topOf, invalidate],
  );

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const now = performance.now();
    active.current = active.current.filter((p) => now - p.start < (p.points.length - 1) * HOP_MS);
    let n = 0;
    for (const p of active.current) {
      const t = Math.max(0, now - p.start) / HOP_MS;
      const hop = Math.min(p.points.length - 2, Math.floor(t));
      const f = Math.min(1, t - hop);
      const a = p.points[hop];
      const b = p.points[hop + 1];
      tmp.position.set(
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f + 0.5,
        a[2] + (b[2] - a[2]) * f,
      );
      tmp.updateMatrix();
      m.setMatrixAt(n, tmp.matrix);
      n += 1;
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (n) invalidate();
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, MAX_ACTIVE]} frustumCulled={false}>
      <meshBasicMaterial color={colours.accent} />
    </instancedMesh>
  );
}
