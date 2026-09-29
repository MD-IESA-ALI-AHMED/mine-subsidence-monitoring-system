import { useNodes } from '../../services/queries.js';
import { useTimeStore } from '../../store/timeStore.js';

// Phase 5 stand-in for the 3D scene (phase 6) and the time scrubber (phase 7).
export function SceneRegion() {
  const at = useTimeStore((st) => st.at);
  const { data: nodes } = useNodes(at);
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-faint)',
        fontSize: 'var(--fs-xs)',
      }}
    >
      <span className="mono">3D site view · {nodes?.length ?? '—'} nodes</span>
    </div>
  );
}
