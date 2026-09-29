import { TIER_LABELS, TIER_SHAPES, TIERS } from '@subsidence/shared';
import { useUiStore } from '../../store/uiStore.js';
import { METRIC_LABELS, MESH_LAYER_COLOURS, SCALE_TICKS, scaleSwatches } from './colourScales.js';
import { NODE_SHAPE_KEY } from './nodeParts.js';
import s from './Scene.module.css';

function ScaleBar({ metric, theme }) {
  const swatches = scaleSwatches(metric, theme, 32);
  const meta = METRIC_LABELS[metric];
  return (
    <div className={s.legendBlock}>
      <div className={s.legendTitle}>
        {meta.label}
        {meta.unit && <span className={s.legendUnit}> {meta.unit}</span>}
        {meta.note && <span className={s.legendNote}> · {meta.note}</span>}
      </div>
      <div
        className={s.scale}
        style={{ background: `linear-gradient(to right, ${swatches.join(',')})` }}
        aria-hidden
      />
      <div className={s.ticks}>
        {SCALE_TICKS[metric].map(([t, label]) => (
          <span key={label} style={{ left: `${t * 100}%` }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function MeshLayerKey({ theme }) {
  return (
    <div className={s.legendBlock}>
      <div className={s.legendTitle}>Mesh layer</div>
      <div className={s.keyRow}>
        {MESH_LAYER_COLOURS[theme].map((c, i) => (
          <span key={c} className={s.keyItem}>
            <span className={s.dot} style={{ background: c }} />
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Bottom-left legend. Every colour and shape in the scene is explained here: the terrain's
 * sinking scale, the node colour scale (whatever "Colour by" is), the tier key and node shapes.
 */
export function Legend({ theme }) {
  const colourBy = useUiStore((st) => st.colourBy);
  const surface = useUiStore((st) => st.layers.surface);
  return (
    <div className={`${s.overlay} ${s.bottomLeft} ${s.legend}`} aria-label="Legend">
      {surface && colourBy !== 'sinking' && (
        <div className={s.legendSub}>
          Ground: <ScaleBar metric="sinking" theme={theme} />
        </div>
      )}
      {colourBy === 'meshLayer' ? (
        <MeshLayerKey theme={theme} />
      ) : (
        <ScaleBar metric={colourBy} theme={theme} />
      )}
      <div className={s.keyRow} aria-label="Tiers">
        {TIERS.map((t) => (
          <span key={t} className={s.keyItem} style={{ color: `var(--tier-${t}-text)` }}>
            {TIER_SHAPES[t]} <span className={s.keyText}>{TIER_LABELS[t].toLowerCase()}</span>
          </span>
        ))}
        <span className={s.keyItem}>
          <span className={s.hollow} /> <span className={s.keyText}>offline</span>
        </span>
      </div>
      <details className={s.shapes}>
        <summary>Node shapes</summary>
        <ul>
          {NODE_SHAPE_KEY.map((k) => (
            <li key={k.type}>
              <strong>{k.label}</strong> — {k.glyph}
            </li>
          ))}
          <li>
            <strong>Pulsing red ring</strong> — silent after rising
          </li>
        </ul>
      </details>
    </div>
  );
}
