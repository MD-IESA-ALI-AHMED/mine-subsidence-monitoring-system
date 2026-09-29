import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion } from '../../hooks/useMediaQuery.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { colourFor, nodeMetric } from './colourScales.js';
import { FatLines } from './FatLines.jsx';
import { NodeLabels } from './NodeLabels.jsx';
import { NodePart } from './NodePart.jsx';
import { PARTS, PICKABLE } from './nodeParts.js';
import { NODE_SCALE } from './sceneMath.js';
import { useSceneModel } from './sceneContext.js';

const HOVER_SCALE = 1.3;
const offlineLike = (n) => n.status === 'offline';

/** Slowly pulsing ring around a node that went silent while its speed was rising. */
function SilentRing({ position, colour }) {
  const ref = useRef();
  const reduced = useReducedMotion();
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const t = (clock.elapsedTime % 2.4) / 2.4;
    ref.current.scale.setScalar(1 + t * 0.8);
    ref.current.material.opacity = 0.9 * (1 - t);
    invalidate();
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.2, 2.7, 32]} />
      <meshBasicMaterial color={colour} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}

/** Dashed ring around a node the mesh cannot reach while it is degraded. */
function UnreachableRing({ position, colour }) {
  const positions = useMemo(() => {
    const out = [];
    const r = 4;
    for (let k = 0; k < 32; k += 1) {
      const a0 = (k / 32) * Math.PI * 2;
      const a1 = ((k + 1) / 32) * Math.PI * 2;
      out.push(
        position[0] + r * Math.cos(a0),
        position[1] + 0.3,
        position[2] + r * Math.sin(a0),
        position[0] + r * Math.cos(a1),
        position[1] + 0.3,
        position[2] + r * Math.sin(a1),
      );
    }
    return new Float32Array(out);
  }, [position]);
  return (
    <FatLines positions={positions} color={colour} width={2} dashed dashSize={1.5} gapSize={1.2} />
  );
}

/**
 * Every node as instanced parts, coloured by the chosen metric. Offline nodes are drawn hollow in
 * the offline tone. `appear(node, index)` (0..1) lets the opening animation raise nodes into place.
 */
export function Nodes({ nodes, appear, unreachable = [] }) {
  const { place, colours } = useSceneModel();
  const colourBy = useUiStore((s) => s.colourBy);
  const hovered = useSelectionStore((s) => s.hovered);
  const selected = useSelectionStore((s) => s.selected);
  const { hover, select } = useSelectionStore.getState();

  // Sensors have no mesh layer of their own: they take the layer of the relay they report to.
  const layerById = useMemo(() => new Map(nodes.map((n) => [n.id, n.meshLayer])), [nodes]);
  const metricOf = (n) =>
    colourBy === 'meshLayer'
      ? (n.meshLayer ?? layerById.get(n.parentRelayId) ?? null)
      : nodeMetric(n, colourBy);

  const items = useMemo(
    () =>
      nodes.map((n, i) => {
        const a = appear ? appear(n, i) : 1;
        const isHover =
          (hovered?.kind === 'node' && hovered.id === n.id) ||
          (selected?.kind === 'node' && selected.id === n.id);
        const base = place(n.x, n.y, (1 - a) * 0.5 * NODE_SCALE);
        const colour = offlineLike(n)
          ? colours.offline
          : (colourFor(colourBy, metricOf(n), colours.theme) ?? colours.textFaint);
        return {
          id: n.id,
          type: n.type,
          base,
          colour,
          scale: a * (isHover ? HOVER_SCALE : 1),
          hollow: offlineLike(n),
          node: n,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, place, colourBy, colours, hovered, selected, appear, layerById],
  );

  const onLeave = () => {
    hover(null);
    document.body.style.cursor = '';
  };
  const onHover = (id) => {
    if (useSelectionStore.getState().hovered?.id !== id) hover('node', id);
    document.body.style.cursor = 'pointer';
  };
  const onPick = (id) => id && select('node', id);
  useEffect(() => () => (document.body.style.cursor = ''), []);

  const silent = items.filter((it) => it.node.status === 'silent_after_rise');

  return (
    <group name="nodes">
      {PARTS.flatMap((part) =>
        [false, true].map((hollow) => {
          const list = items.filter(
            (it) => part.types.includes(it.type) && it.hollow === hollow && it.scale > 0.001,
          );
          const pickable = PICKABLE.has(part.id);
          return (
            <NodePart
              key={`${part.id}-${hollow}`}
              part={part}
              items={list}
              hollow={hollow && part.metric}
              neutral={colours.lineStrong}
              rim={colours.textMuted}
              onPick={pickable ? onPick : undefined}
              onHover={pickable ? onHover : undefined}
              onLeave={pickable ? onLeave : undefined}
            />
          );
        }),
      )}
      {silent.map((it) => (
        <SilentRing
          key={it.id}
          position={[it.base[0], it.base[1] + 0.3, it.base[2]]}
          colour={colours.tierCritical}
        />
      ))}
      {items
        .filter((it) => unreachable.includes(it.id))
        .map((it) => (
          <UnreachableRing key={`down-${it.id}`} position={it.base} colour={colours.tierWarning} />
        ))}
      <NodeLabels items={items} />
    </group>
  );
}
