import { useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useSectionStore } from '../../store/sectionStore.js';
import { FatLines } from './FatLines.jsx';
import { fromScene } from './sceneMath.js';
import { useSceneModel } from './sceneContext.js';

const SAMPLES = 80;

/**
 * Section view: press and drag across the terrain to draw a line. While drawing, orbiting is off.
 * Wraps the terrain so pointer events on it land here.
 */
export function SectionTool({ active, children }) {
  const { frame, place, colours } = useSceneModel();
  const controls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);
  const line = useSectionStore((s) => s.line);
  const setLine = useSectionStore((s) => s.setLine);
  const drag = useRef(null);

  const toSite = (e) => fromScene(frame, e.point.x, e.point.z);
  const handlers = active
    ? {
        onPointerDown: (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.target.setPointerCapture?.(e.pointerId);
          const p = toSite(e);
          drag.current = p;
          if (controls) controls.enabled = false;
          setLine({ a: p, b: p });
        },
        onPointerMove: (e) => {
          if (!drag.current) return;
          e.stopPropagation();
          setLine({ a: drag.current, b: toSite(e) });
          invalidate();
        },
        onPointerUp: (e) => {
          if (!drag.current) return;
          e.stopPropagation();
          drag.current = null;
          if (controls) controls.enabled = true;
        },
      }
    : {};

  const positions = useMemo(() => {
    if (!line) return null;
    const out = [];
    let prev = null;
    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = i / SAMPLES;
      const p = place(
        line.a[0] + (line.b[0] - line.a[0]) * t,
        line.a[1] + (line.b[1] - line.a[1]) * t,
        0.6,
      );
      if (prev) out.push(...prev, ...p);
      prev = p;
    }
    return new Float32Array(out);
  }, [line, place]);

  return (
    <group {...handlers}>
      {children}
      {active && positions && (
        <FatLines positions={positions} color={colours.accent} width={2.5} renderOrder={4} />
      )}
    </group>
  );
}
