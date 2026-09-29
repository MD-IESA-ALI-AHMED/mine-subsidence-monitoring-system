import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLinks, useNodes, useSite, useZones } from '../../services/queries.js';
import { useTimeStore } from '../../store/timeStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { useReducedMotion } from '../../hooks/useMediaQuery.js';
import { InlineError } from '../../ui/Panel.jsx';
import { CameraRig } from './CameraRig.jsx';
import { Contours } from './Contours.jsx';
import { Legend } from './Legend.jsx';
import { Links } from './Links.jsx';
import { Nodes } from './Nodes.jsx';
import { TOP_Y } from './nodeParts.js';
import { Packets } from './Packets.jsx';
import { Panels } from './Panels.jsx';
import { PlanOverlay, ScaleProbe } from './PlanOverlay.jsx';
import { ColourAndLayers, ViewAndExaggeration } from './SceneControls.jsx';
import { SceneContext } from './sceneContext.js';
import { NODE_SCALE, frameOf, surfaceHeight, toScene } from './sceneMath.js';
import { SectionTool } from './SectionTool.jsx';
import { SiteFeatures } from './SiteFeatures.jsx';
import { Terrain } from './Terrain.jsx';
import { useDecodedTerrain } from './useDecodedTerrain.js';
import { useSceneColours } from './useSceneColours.js';
import { Zones } from './Zones.jsx';
import s from './Scene.module.css';

function useTabVisible() {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

/**
 * The 3D site: terrain with contours, mined panels below, site features, nodes, links, packets and
 * zones. Renders on demand (only when something changes) and pauses while the tab is hidden.
 * `intro` (optional) carries the opening-animation stage values.
 */
export function Scene({ intro }) {
  const at = useTimeStore((st) => st.at);
  const { data: site } = useSite();
  const terrain = useDecodedTerrain(at);
  const nodes = useNodes(at);
  const links = useLinks(at);
  const zones = useZones(at);
  const colours = useSceneColours();
  const reduced = useReducedMotion();
  const visible = useTabVisible();
  const { exaggeration, layers, view } = useUiStore();
  const barRef = useRef(null);

  const grid = terrain.grid;
  const model = useMemo(() => {
    if (!site || !grid) return null;
    const frame = frameOf(site);
    const place = (x, y, dh = 0) =>
      toScene(frame, x, y, surfaceHeight(grid, frame, exaggeration, x, y) + dh);
    const face = grid.faces?.[0];
    const p1 = site.panels.find((p) => p.panelId === face?.panelId);
    const origin =
      face && p1
        ? [(face.x + p1.face.start_m) / 2, (face.yMin + face.yMax) / 2]
        : [frame.cx, frame.cy];
    return { site, frame, grid, exaggeration, colours, place, origin };
  }, [site, grid, exaggeration, colours]);

  const nodeList = nodes.data;
  const byId = useMemo(() => new Map((nodeList ?? []).map((n) => [n.id, n])), [nodeList]);
  const topOf = useCallback(
    (id) => {
      const n = byId.get(id);
      return n && model ? model.place(n.x, n.y, TOP_Y[n.type] * NODE_SCALE) : null;
    },
    [byId, model],
  );
  const layerOf = useCallback((id) => byId.get(id)?.meshLayer ?? null, [byId]);

  if (terrain.isError) {
    return (
      <div className={s.region}>
        <div style={{ position: 'absolute', left: 16, right: 16, top: 16 }}>
          <InlineError message="Could not load the terrain." onRetry={terrain.refetch} />
        </div>
      </div>
    );
  }

  const st = intro ?? {};
  return (
    <div
      className={s.region}
      aria-label="3D view of the site, its underground panels and sensor mesh"
    >
      {model && (
        <Canvas
          className={s.canvas}
          frameloop={visible ? 'demand' : 'never'}
          shadows
          dpr={[1, 2]}
          camera={{ fov: 35, near: 1, far: 4000, position: [0, 500, 400] }}
          gl={{ antialias: true }}
        >
          <SceneContext.Provider value={model}>
            <color attach="background" args={[colours.bg]} />
            <hemisphereLight args={[colours.surface2, colours.bg, 0.9]} />
            <directionalLight
              position={[-220, 190, -220]}
              intensity={1.6}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0004}
              shadow-normalBias={1.2}
              shadow-camera-left={-220}
              shadow-camera-right={220}
              shadow-camera-top={220}
              shadow-camera-bottom={-220}
            />
            <SectionTool active={view === 'section'}>
              <Terrain opacity={st.terrain ?? 1} />
            </SectionTool>
            <Contours reveal={st.contours ?? 1} />
            <Panels opacity={st.terrain ?? 1} />
            <SiteFeatures opacity={st.terrain ?? 1} />
            {nodeList && <Nodes nodes={nodeList} appear={st.appear} />}
            {layers.links && links.data && nodeList && (
              <Links
                linkState={links.data}
                topOf={topOf}
                layerOf={layerOf}
                reveal={st.links ?? 1}
              />
            )}
            {layers.packets && !reduced && at == null && links.data && (
              <Packets links={links.data.links} topOf={topOf} />
            )}
            {layers.zones && <Zones zones={zones.data} opacity={st.zones ?? 1} />}
            <CameraRig nodes={nodeList} zones={zones.data} />
            {view === 'top' && <ScaleProbe barRef={barRef} />}
          </SceneContext.Provider>
        </Canvas>
      )}
      {!model && <p className={s.status}>Loading terrain…</p>}
      {model && !nodeList && <p className={s.status}>Loading nodes…</p>}
      {(st.ui ?? 1) > 0 && (
        <>
          <ColourAndLayers />
          <ViewAndExaggeration />
          <Legend theme={colours.theme} />
          {view === 'top' && <PlanOverlay barRef={barRef} />}
        </>
      )}
    </div>
  );
}
