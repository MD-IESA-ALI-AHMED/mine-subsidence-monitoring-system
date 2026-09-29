import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion } from '../../hooks/useMediaQuery.js';
import { useUiStore } from '../../store/uiStore.js';
import { colourFor } from './colourScales.js';
import { FatLines } from './FatLines.jsx';
import { linkSegments } from './linkGeometry.js';
import { useSceneModel } from './sceneContext.js';

const FADE_MS = 600;

function LinkSet({ links, topOf, layerOf, opacity, reveal }) {
  const { colours } = useSceneModel();
  const { backup: showBackup } = useUiStore((s) => s.layers);
  const colourBy = useUiStore((s) => s.colourBy);

  const geo = useMemo(() => {
    const byKind = (k) => links.filter((l) => l.kind === k);
    const bg = colours.bg;
    const meshColour = (l) =>
      colourBy === 'meshLayer'
        ? colourFor('meshLayer', layerOf(l.from), colours.theme)
        : colours.textMuted;
    return {
      primary: linkSegments(byKind('espnow_primary'), topOf, {
        colourOf: () => colours.lineStrong,
        bg,
      }),
      backup: linkSegments(byKind('espnow_backup'), topOf, { colourOf: () => colours.line, bg }),
      mesh: linkSegments(byKind('mesh'), topOf, { arc: true, colourOf: meshColour, bg }),
    };
  }, [links, topOf, layerOf, colours, colourBy]);

  return (
    <group>
      <FatLines
        positions={geo.primary.positions}
        colors={geo.primary.colors}
        width={1}
        opacity={0.9 * opacity}
        reveal={reveal}
      />
      {showBackup && (
        <FatLines
          positions={geo.backup.positions}
          colors={geo.backup.colors}
          width={1}
          opacity={0.6 * opacity}
          dashed
          dashSize={2}
          gapSize={2}
          reveal={reveal}
        />
      )}
      <FatLines
        positions={geo.mesh.positions}
        colors={geo.mesh.colors}
        width={2.2}
        opacity={opacity}
        reveal={reveal}
      />
    </group>
  );
}

/**
 * ESP-NOW links (sensor -> relay) and the Wi-Fi mesh tree (relay -> parent, arcs). When the tree
 * changes (root failure), the old tree fades out and the new one in over 600 ms.
 */
export function Links({ linkState, topOf, layerOf, reveal = 1 }) {
  const reduced = useReducedMotion();
  const invalidate = useThree((st) => st.invalidate);
  const [shown, setShown] = useState({ current: linkState, previous: null, since: 0 });
  const [t, setT] = useState(1);
  const last = useRef(linkState);

  useEffect(() => {
    const prev = last.current;
    last.current = linkState;
    const treeChanged =
      prev &&
      linkState &&
      (prev.rootId !== linkState.rootId || prev.links.length !== linkState.links.length);
    if (treeChanged && !reduced) {
      setShown({ current: linkState, previous: prev, since: performance.now() });
      setT(0);
    } else {
      setShown({ current: linkState, previous: null, since: 0 });
      setT(1);
    }
    invalidate();
  }, [linkState, reduced, invalidate]);

  useFrame(() => {
    if (!shown.previous) return;
    const next = Math.min(1, (performance.now() - shown.since) / FADE_MS);
    setT(next);
    if (next >= 1) setShown((st) => ({ ...st, previous: null }));
    invalidate();
  });

  if (!shown.current) return null;
  return (
    <group name="links">
      {shown.previous && (
        <LinkSet
          links={shown.previous.links}
          topOf={topOf}
          layerOf={layerOf}
          opacity={1 - t}
          reveal={1}
        />
      )}
      <LinkSet
        links={shown.current.links}
        topOf={topOf}
        layerOf={layerOf}
        opacity={t}
        reveal={reveal}
      />
    </group>
  );
}
