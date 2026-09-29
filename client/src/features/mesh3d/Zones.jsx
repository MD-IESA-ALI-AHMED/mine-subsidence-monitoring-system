import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { TIER_SHAPES } from '@subsidence/shared';
import { useSelectionStore } from '../../store/selectionStore.js';
import { limitText } from '../../utils/time.js';
import { FatLines } from './FatLines.jsx';
import { SceneLabel } from './SceneLabel.jsx';
import { useSceneModel } from './sceneContext.js';

const LIFT = 0.4;
const EDGE_STEP_M = 4;

/** Hull points densified so the outline follows the sunken surface. */
function densify(hull) {
  const out = [];
  hull.forEach((p, i) => {
    const q = hull[(i + 1) % hull.length];
    const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / EDGE_STEP_M));
    for (let k = 0; k < n; k += 1)
      out.push([p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
  });
  return out;
}

/** Fan from the centroid, each triangle split into strips so the fill hugs the terrain. */
function fillGeometry(ring, centroid, place) {
  const pos = [];
  const STRIPS = 6;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const at = (p, t) => [
      centroid[0] + (p[0] - centroid[0]) * t,
      centroid[1] + (p[1] - centroid[1]) * t,
    ];
    for (let s = 0; s < STRIPS; s += 1) {
      const t0 = s / STRIPS;
      const t1 = (s + 1) / STRIPS;
      const [a0, b0, a1, b1] = [at(a, t0), at(b, t0), at(a, t1), at(b, t1)].map((p) =>
        place(p[0], p[1], LIFT),
      );
      pos.push(...a0, ...a1, ...b1, ...a0, ...b1, ...b0);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  return g;
}

function Zone({ zone, opacity }) {
  const { place, colours } = useSceneModel();
  const hovered = useSelectionStore((s) => s.hovered);
  const selected = useSelectionStore((s) => s.selected);
  const select = useSelectionStore((s) => s.select);
  const emphasised =
    (hovered?.kind === 'zone' && hovered.id === zone.zoneKey) ||
    (selected?.kind === 'zone' && selected.id === zone.zoneKey);
  const tier = zone.severity?.tier ?? 'normal';
  const colour = colours.tier[tier];

  const ring = useMemo(() => (zone.hull.length >= 3 ? densify(zone.hull) : []), [zone.hull]);
  const outline = useMemo(() => {
    const out = [];
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length];
      out.push(...place(p[0], p[1], LIFT), ...place(q[0], q[1], LIFT));
    });
    return new Float32Array(out);
  }, [ring, place]);
  const fill = useMemo(
    () => (ring.length ? fillGeometry(ring, zone.centroid, place) : null),
    [ring, zone.centroid, place],
  );
  useEffect(() => () => fill?.dispose(), [fill]);

  if (!ring.length) return null;
  const labelPos = place(zone.centroid[0], zone.centroid[1], 14);
  const limit = limitText(zone.tCrit?.used_h);
  return (
    <group>
      <mesh
        geometry={fill}
        onClick={(e) => (e.stopPropagation(), select('zone', zone.zoneKey))}
        renderOrder={2}
      >
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={(emphasised ? 0.22 : 0.12) * opacity}
          depthWrite={false}
          side={2}
        />
      </mesh>
      <FatLines
        positions={outline}
        color={colour}
        width={emphasised ? 3 : 2}
        opacity={opacity}
        renderOrder={3}
      />
      {opacity > 0.5 && (
        <SceneLabel position={labelPos} tone={emphasised ? 'selected' : 'default'}>
          <span style={{ color: colour }}>{TIER_SHAPES[tier]}</span> {zone.zoneKey}
          {limit && <span style={{ color: 'var(--text-muted)' }}> · {limit}</span>}
        </SceneLabel>
      )}
    </group>
  );
}

/** Active moving zones draped on the terrain: tier-coloured outline, faint fill, one label each. */
export function Zones({ zones, opacity = 1 }) {
  return (
    <group name="zones">
      {(zones ?? []).map((z) => (
        <Zone key={z.zoneKey} zone={z} opacity={opacity} />
      ))}
    </group>
  );
}
