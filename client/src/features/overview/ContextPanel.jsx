import { X } from 'lucide-react';
import { useNodes, useZones } from '../../services/queries.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { Button, IconButton } from '../../ui/Button.jsx';
import { TierBadge } from '../../ui/TierBadge.jsx';
import { formatDateTime } from '../../utils/time.js';
import { ZoneDetail } from '../forecast/ZoneDetail.jsx';
import { NodeDetail } from '../nodes/NodeDetail.jsx';
import { SiteSummary } from '../summary/SiteSummary.jsx';
import s from './ContextPanel.module.css';

export const contextTitle = (sel) =>
  !sel || sel.kind === 'panel'
    ? 'Site summary'
    : sel.kind === 'zone'
      ? `Zone ${sel.id}`
      : `Node ${sel.id}`;

function NotLiveBanner() {
  const at = useTimeStore((st) => st.at);
  const goLive = useTimeStore((st) => st.goLive);
  const hour12 = useUiStore((st) => st.settings.hour12);
  if (at == null) return null;
  return (
    <div className={s.notLive} role="status">
      <span>Viewing {formatDateTime(at, { hour12 })} — not live</span>
      <Button size="small" onClick={goLive}>
        Back to live
      </Button>
    </div>
  );
}

/** One context panel whose content depends on the selection. Escape clears the selection. */
export function ContextPanel({ embedded = false }) {
  const selected = useSelectionStore((st) => st.selected);
  const clear = useSelectionStore((st) => st.clear);
  const at = useTimeStore((st) => st.at);
  const { data: zones } = useZones(at);
  const { data: nodes } = useNodes(at);

  const kind = selected?.kind === 'node' || selected?.kind === 'zone' ? selected.kind : null;
  const zone = kind === 'zone' ? zones?.find((z) => z.zoneKey === selected.id) : null;
  const node = kind === 'node' ? nodes?.find((n) => n.id === selected.id) : null;
  const tier = zone?.severity?.tier ?? node?.tier;

  return (
    <div className={s.panel}>
      {!embedded && (
        <div className={s.header}>
          <h2 className={s.title}>
            {kind ? <span className="mono">{selected.id}</span> : 'Site summary'}
          </h2>
          {tier && <TierBadge tier={tier} boxed />}
          {kind && <IconButton icon={X} label="Close (Esc)" onClick={clear} />}
        </div>
      )}
      <NotLiveBanner />
      <div className={s.body}>
        {kind === 'zone' && <ZoneDetail zoneKey={selected.id} zone={zone} />}
        {kind === 'node' && <NodeDetail nodeId={selected.id} listed={node} />}
        {!kind && <SiteSummary />}
      </div>
    </div>
  );
}
