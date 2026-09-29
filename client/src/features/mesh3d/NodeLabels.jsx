import { isRelayType } from '@subsidence/shared';
import { useSiteNow } from '../../store/liveStore.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { formatNumber } from '../../utils/format.js';
import { formatRelative } from '../../utils/time.js';
import { TOP_Y } from './nodeParts.js';
import { SceneLabel } from './SceneLabel.jsx';
import { NODE_SCALE } from './sceneMath.js';
import s from './Scene.module.css';

function Tooltip({ n }) {
  const now = useSiteNow();
  const v = n.latest ?? {};
  return (
    <div className={s.tooltip}>
      <strong className="mono">{n.id}</strong>
      {!isRelayType(n.type) && (
        <span>
          {formatNumber(v.sinking_mm)} mm · {formatNumber(v.speed_mmPerDay)} mm/day
        </span>
      )}
      <span className={s.tooltipMuted}>last seen {formatRelative(n.lastSeenAt, now)}</span>
    </div>
  );
}

/** Labels only for the hovered and selected node, plus relay IDs when "Labels" is on. */
export function NodeLabels({ items }) {
  const hovered = useSelectionStore((st) => st.hovered);
  const selected = useSelectionStore((st) => st.selected);
  const labelsOn = useUiStore((st) => st.layers.labels);
  const top = (it) => [
    it.base[0],
    it.base[1] + TOP_Y[it.type] * NODE_SCALE * (it.scale || 1) + 1,
    it.base[2],
  ];

  return (
    <>
      {items.map((it) => {
        const isHover = hovered?.kind === 'node' && hovered.id === it.id;
        const isSel = selected?.kind === 'node' && selected.id === it.id;
        if (isHover) {
          return (
            <SceneLabel key={it.id} position={top(it)} offsetY={-28}>
              <Tooltip n={it.node} />
            </SceneLabel>
          );
        }
        if (isSel || (labelsOn && isRelayType(it.type))) {
          return (
            <SceneLabel
              key={it.id}
              position={top(it)}
              tone={isSel ? 'selected' : 'muted'}
              offsetY={-12}
            >
              {it.id}
            </SceneLabel>
          );
        }
        return null;
      })}
    </>
  );
}
