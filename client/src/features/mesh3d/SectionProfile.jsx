import { scaleLinear } from 'd3-scale';
import { useSite } from '../../services/queries.js';
import { useSectionStore } from '../../store/sectionStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { Panel, EmptyState } from '../../ui/Panel.jsx';
import { pointInPolygon } from './geometry2d.js';
import { sampleGrid } from './sceneMath.js';
import { useDecodedTerrain } from './useDecodedTerrain.js';
import s from './Scene.module.css';

const W = 300;
const H1 = 96;
const H2 = 84;
const PAD = { l: 36, r: 8, t: 8, b: 16 };
const N = 120;

/** Samples along the section line: distance, ground elevation, sinking, and panels crossed. */
function profile(grid, site, line) {
  const len = Math.hypot(line.b[0] - line.a[0], line.b[1] - line.a[1]);
  return Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    const x = line.a[0] + (line.b[0] - line.a[0]) * t;
    const y = line.a[1] + (line.b[1] - line.a[1]) * t;
    return {
      d: len * t,
      elev: sampleGrid(grid, grid.elevation, x, y),
      sink: sampleGrid(grid, grid.sinking, x, y),
      panel: site.panels.find((p) => pointInPolygon(x, y, p.polygon)) ?? null,
    };
  });
}

const path = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`;

/** Section view inset: the sinking profile, and the ground with the mined panel below it. */
export function SectionProfile() {
  const at = useTimeStore((st) => st.at);
  const line = useSectionStore((st) => st.line);
  const { grid } = useDecodedTerrain(at);
  const { data: site } = useSite();

  if (!line || !grid || !site || Math.hypot(line.b[0] - line.a[0], line.b[1] - line.a[1]) < 5) {
    return (
      <Panel label="Section">
        <EmptyState>Drag across the terrain to draw a section.</EmptyState>
      </Panel>
    );
  }
  const pts = profile(grid, site, line);
  const len = pts.at(-1).d;
  const x = scaleLinear()
    .domain([0, len])
    .range([PAD.l, W - PAD.r]);
  const maxSink = Math.max(5, ...pts.map((p) => p.sink));
  const ySink = scaleLinear()
    .domain([0, maxSink])
    .range([PAD.t, H1 - PAD.b])
    .nice();
  const maxDepth = Math.max(40, ...site.panels.map((p) => p.depth_m)) * 1.15;
  const yDepth = scaleLinear()
    .domain([0, maxDepth])
    .range([PAD.t, H2 - PAD.b]);

  const sinkArea = `${path(pts.map((p) => [x(p.d), ySink(p.sink)]))}L${x(len)},${ySink(0)}L${x(0)},${ySink(0)}Z`;
  const panelRuns = [];
  pts.forEach((p, i) => {
    if (!p.panel) return;
    const last = panelRuns.at(-1);
    if (last && last.panel === p.panel && last.to === i - 1) last.to = i;
    else panelRuns.push({ panel: p.panel, from: i, to: i });
  });

  return (
    <Panel label="Section">
      <p className={s.sectionMeta}>
        {len.toFixed(0)} m · peak sinking {maxSink.toFixed(0)} mm
      </p>
      <svg
        viewBox={`0 0 ${W} ${H1}`}
        className={s.sectionSvg}
        role="img"
        aria-label="Sinking along the section"
      >
        {ySink.ticks(3).map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={ySink(t)} y2={ySink(t)} stroke="var(--line)" />
            <text x={PAD.l - 4} y={ySink(t) + 3} textAnchor="end" className={s.axis}>
              {t}
            </text>
          </g>
        ))}
        <path
          d={sinkArea}
          fill="var(--tier-watch)"
          fillOpacity="0.18"
          stroke="var(--tier-watch)"
          strokeWidth="1.5"
        />
        <text x={PAD.l} y={H1 - 3} className={s.axis}>
          Sinking, mm (down)
        </text>
      </svg>
      <svg
        viewBox={`0 0 ${W} ${H2}`}
        className={s.sectionSvg}
        role="img"
        aria-label="Ground and mined panel along the section"
      >
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={yDepth(0)}
          y2={yDepth(0)}
          stroke="var(--text-muted)"
          strokeWidth="1.5"
        />
        {panelRuns.map((r) => (
          <g key={`${r.panel.panelId}-${r.from}`}>
            <rect
              x={x(pts[r.from].d)}
              width={Math.max(1, x(pts[r.to].d) - x(pts[r.from].d))}
              y={yDepth(r.panel.depth_m) - 2}
              height={Math.max(3, (r.panel.seamThickness_m ?? 2) * 1.5)}
              fill="var(--text-muted)"
            />
            <text x={x(pts[r.from].d) + 2} y={yDepth(r.panel.depth_m) - 5} className={s.axis}>
              {r.panel.panelId} · {r.panel.depth_m} m
            </text>
          </g>
        ))}
        {yDepth.ticks(3).map((t) => (
          <text key={t} x={PAD.l - 4} y={yDepth(t) + 3} textAnchor="end" className={s.axis}>
            {t}
          </text>
        ))}
        <text x={PAD.l} y={H2 - 3} className={s.axis}>
          Depth below ground, m · distance {len.toFixed(0)} m
        </text>
      </svg>
    </Panel>
  );
}
