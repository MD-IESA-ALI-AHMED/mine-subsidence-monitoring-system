import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useReducedMotion } from '../../hooks/useMediaQuery.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { ease, framePose, viewPose } from './cameraMath.js';
import { useSceneModel } from './sceneContext.js';

const DEG = Math.PI / 180;
const MOVE_MS = 500;
const PAN_STEP_M = 12;

/** Where to put the camera for the current selection: [target, distance] or null. */
function focusFor(sel, { nodes, zones, site, place }) {
  if (!sel) return null;
  if (sel.kind === 'node') {
    const n = nodes?.find((x) => x.id === sel.id);
    return n ? [place(n.x, n.y, 0), 110] : null;
  }
  if (sel.kind === 'zone') {
    const z = zones?.find((x) => x.zoneKey === sel.id);
    if (!z) return null;
    const r = Math.max(
      ...z.hull.map(([x, y]) => Math.hypot(x - z.centroid[0], y - z.centroid[1])),
      20,
    );
    return [place(z.centroid[0], z.centroid[1], 0), Math.max(120, r * 4)];
  }
  if (sel.kind === 'panel') {
    const p = site.panels.find((x) => x.panelId === sel.id);
    if (!p) return null;
    const cx = p.polygon.reduce((s, q) => s + q[0], 0) / p.polygon.length;
    const cy = p.polygon.reduce((s, q) => s + q[1], 0) / p.polygon.length;
    return [place(cx, cy, 0), 320];
  }
  return null;
}

/** Orbit controls with limits, view presets, easing to the selection, and keyboard shortcuts. */
export function CameraRig({ nodes, zones, enabled = true, introCamera = null }) {
  const model = useSceneModel();
  const { frame } = model;
  const { camera, invalidate } = useThree();
  const controls = useRef();
  const tween = useRef(null);
  const reduced = useReducedMotion();
  const view = useUiStore((s) => s.view);
  const focusSeq = useSelectionStore((s) => s.focusSeq);

  const moveTo = (pose) => {
    const c = controls.current;
    if (!c) return;
    const from = { position: camera.position.clone(), target: c.target.clone() };
    const to = { position: new Vector3(...pose.position), target: new Vector3(...pose.target) };
    tween.current = { from, to, start: performance.now(), ms: reduced ? 0 : MOVE_MS };
    invalidate();
  };

  // View presets.
  useEffect(() => {
    moveTo(viewPose(view, frame, [0, 0, 0], camera));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, frame]);

  // Frame the selection whenever something asks for focus.
  useEffect(() => {
    if (!focusSeq || !controls.current) return;
    const f = focusFor(useSelectionStore.getState().selected, { ...model, nodes, zones });
    if (f) moveTo(framePose(camera, controls.current.target, f[0], f[1]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  // Opening animation: from a high top view down to the current view preset.
  const introActive = introCamera != null;
  useEffect(() => {
    const c = controls.current;
    if (!introActive || !c) return;
    tween.current = null;
    const end = viewPose(view, frame, [0, 0, 0], camera);
    const top = viewPose('top', frame, [0, 0, 0], camera);
    const from = new Vector3(top.position[0], top.position[1] * 1.6, top.position[2]);
    camera.position.lerpVectors(from, new Vector3(...end.position), ease(introCamera));
    c.target.set(0, 0, 0);
    c.update();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introActive, introCamera]);

  useFrame(() => {
    const tw = tween.current;
    const c = controls.current;
    if (introActive) tween.current = null;
    if (!tw || !c || introActive) return;
    const t = tw.ms ? Math.min(1, (performance.now() - tw.start) / tw.ms) : 1;
    const k = ease(t);
    camera.position.lerpVectors(tw.from.position, tw.to.position, k);
    c.target.lerpVectors(tw.from.target, tw.to.target, k);
    c.update();
    if (t >= 1) tween.current = null;
    invalidate();
  });

  // Keyboard: 1/2/3 views, L labels, Z zones, F frame selection, arrows pan.
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.target.closest?.(
          'input, textarea, select, [contenteditable], [role="slider"], [role="radiogroup"], table',
        ) ||
        e.metaKey ||
        e.ctrlKey
      )
        return;
      const ui = useUiStore.getState();
      const views = { 1: 'top', 2: 'oblique', 3: 'section' };
      if (views[e.key]) ui.setView(views[e.key]);
      else if (e.key === 'l' || e.key === 'L') ui.toggleLayer('labels');
      else if (e.key === 'z' || e.key === 'Z') ui.toggleLayer('zones');
      else if (e.key === 'f' || e.key === 'F') useSelectionStore.getState().focus();
      else if (e.key.startsWith('Arrow') && controls.current) {
        e.preventDefault();
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
          e.key
        ];
        const c = controls.current;
        const fwd = new Vector3().subVectors(c.target, camera.position).setY(0).normalize();
        const right = new Vector3().crossVectors(fwd, new Vector3(0, 1, 0));
        const delta = right
          .multiplyScalar(d[0] * PAN_STEP_M)
          .add(fwd.multiplyScalar(-d[1] * PAN_STEP_M));
        camera.position.add(delta);
        c.target.add(delta);
        c.update();
        invalidate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [camera, invalidate]);

  const span = Math.hypot(frame.width, frame.depth);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={enabled && !introActive}
      enableDamping={false}
      minPolarAngle={view === 'top' ? 0 : 10 * DEG}
      maxPolarAngle={80 * DEG}
      minDistance={30}
      maxDistance={span * 2.4}
      onChange={() => {
        const t = controls.current?.target;
        if (!t) return;
        // Keep the target over the site so the camera can never wander off or under the ground.
        t.x = Math.max(-frame.width / 2, Math.min(frame.width / 2, t.x));
        t.z = Math.max(-frame.depth / 2, Math.min(frame.depth / 2, t.z));
        t.y = Math.max(-40, Math.min(20, t.y));
      }}
    />
  );
}
