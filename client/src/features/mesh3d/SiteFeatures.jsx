import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { FatLines } from './FatLines.jsx';
import { SceneLabel } from './SceneLabel.jsx';
import { useSceneModel } from './sceneContext.js';

const ROAD_LIFT = 0.3;

/** A flat band following a polyline, draped on the surface (the haul road). */
function bandGeometry(polyline, width, place) {
  const pos = [];
  for (let i = 1; i < polyline.length; i += 1) {
    const [x0, y0] = polyline[i - 1];
    const [x1, y1] = polyline[i];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (-(y1 - y0) / len) * (width / 2);
    const ny = ((x1 - x0) / len) * (width / 2);
    const a = place(x0 + nx, y0 + ny, ROAD_LIFT);
    const b = place(x0 - nx, y0 - ny, ROAD_LIFT);
    const c = place(x1 + nx, y1 + ny, ROAD_LIFT);
    const d = place(x1 - nx, y1 - ny, ROAD_LIFT);
    pos.push(...a, ...b, ...c, ...b, ...d, ...c);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

/** Haul road, village edge (dashed, labelled) and the control room. */
export function SiteFeatures({ opacity = 1 }) {
  const { site, place, colours } = useSceneModel();
  const road = site.haulRoads?.[0];

  const roadGeom = useMemo(
    () => (road ? bandGeometry(road.polyline, road.width_m ?? 8, place) : null),
    [road, place],
  );
  useEffect(() => () => roadGeom?.dispose(), [roadGeom]);

  const village = useMemo(() => {
    const pl = site.villageEdge?.polyline ?? [];
    const out = [];
    for (let i = 1; i < pl.length; i += 1) {
      const steps = 20;
      for (let k = 0; k < steps; k += 1) {
        const t0 = k / steps;
        const t1 = (k + 1) / steps;
        const lerp = (t) => [
          pl[i - 1][0] + (pl[i][0] - pl[i - 1][0]) * t,
          pl[i - 1][1] + (pl[i][1] - pl[i - 1][1]) * t,
        ];
        out.push(...place(...lerp(t0), 0.3), ...place(...lerp(t1), 0.3));
      }
    }
    return new Float32Array(out);
  }, [site, place]);

  const cr = site.controlRoom;
  const crPos = place(cr.x, cr.y, 2);
  const vl = site.villageEdge?.polyline;
  const villageLabel = vl ? place((vl[0][0] + vl.at(-1)[0]) / 2, vl[0][1], 1) : null;

  return (
    <group name="site-features">
      {roadGeom && (
        <mesh geometry={roadGeom} receiveShadow>
          <meshStandardMaterial
            color={colours.lineStrong}
            roughness={1}
            transparent
            opacity={0.85 * opacity}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}
      <FatLines
        positions={village}
        color={colours.textMuted}
        width={1.5}
        opacity={opacity}
        dashed
        dashSize={4}
        gapSize={3}
      />
      <mesh position={crPos} castShadow>
        <boxGeometry args={[8, 4, 6]} />
        <meshStandardMaterial
          color={colours.textMuted}
          roughness={0.9}
          transparent
          opacity={opacity}
        />
      </mesh>
      {opacity > 0.5 && villageLabel && (
        <SceneLabel position={villageLabel} tone="muted" offsetY={-12}>
          {site.villageEdge.name}
        </SceneLabel>
      )}
    </group>
  );
}
