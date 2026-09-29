import { useMemo } from 'react';
import { FatLines } from './FatLines.jsx';
import { SceneLabel } from './SceneLabel.jsx';
import { DEPTH_SCALE, toScene } from './sceneMath.js';
import { useSceneModel } from './sceneContext.js';

function outline(frame, polygon, y) {
  const out = [];
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    out.push(...toScene(frame, p[0], p[1], y), ...toScene(frame, q[0], q[1], y));
  });
  return out;
}

/**
 * Mined areas under the ground: thin outlines at their (compressed) depth, dashed lines up to the
 * surface at the corners, and the current longwall face as a line that moves with time.
 */
export function Panels({ opacity = 1 }) {
  const { site, frame, grid, place, colours } = useSceneModel();

  const { flat, risers, labels } = useMemo(() => {
    const f = [];
    const r = [];
    const l = [];
    for (const p of site.panels) {
      const y = -p.depth_m * DEPTH_SCALE;
      f.push(...outline(frame, p.polygon, y));
      for (const [x, yy] of p.polygon) r.push(...toScene(frame, x, yy, y), ...place(x, yy, 0));
      const cx = p.polygon.reduce((s, q) => s + q[0], 0) / p.polygon.length;
      const minY = Math.min(...p.polygon.map((q) => q[1]));
      l.push({ key: p.panelId, text: p.name, position: toScene(frame, cx, minY, y) });
    }
    return { flat: new Float32Array(f), risers: new Float32Array(r), labels: l };
  }, [site, frame, place]);

  const face = useMemo(() => {
    const out = [];
    for (const fc of grid.faces ?? []) {
      const p = site.panels.find((q) => q.panelId === fc.panelId);
      const y = -p.depth_m * DEPTH_SCALE;
      out.push(...toScene(frame, fc.x, fc.yMin, y), ...toScene(frame, fc.x, fc.yMax, y));
    }
    return new Float32Array(out);
  }, [grid.faces, site, frame]);

  return (
    <group name="panels">
      <FatLines positions={flat} color={colours.textMuted} width={1.2} opacity={0.8 * opacity} />
      <FatLines
        positions={risers}
        color={colours.textFaint}
        width={1}
        opacity={0.6 * opacity}
        dashed
        dashSize={2}
        gapSize={2}
      />
      <FatLines positions={face} color={colours.accent} width={2.5} opacity={opacity} />
      {opacity > 0.5 &&
        labels.map((l) => (
          <SceneLabel key={l.key} position={l.position} tone="muted" offsetY={12}>
            {l.text}
          </SceneLabel>
        ))}
    </group>
  );
}
