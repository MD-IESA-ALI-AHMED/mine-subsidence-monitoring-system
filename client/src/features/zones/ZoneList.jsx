import { useEffect } from 'react';
import { useStatus, useZones } from '../../services/queries.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { TierBadge } from '../../ui/TierBadge.jsx';
import { EmptyState, InlineError, Panel, SkeletonRows } from '../../ui/Panel.jsx';
import { Value } from '../../ui/Value.jsx';
import { formatTime, limitText } from '../../utils/time.js';
import s from '../overview/Rail.module.css';
import { sortZones } from './zoneOrder.js';

function ZoneRow({ zone }) {
  const selected = useSelectionStore((st) => st.selected);
  const { select, hover } = useSelectionStore.getState();
  const pulseZone = useToastStore((st) => st.pulseZone);
  const clearPulse = useToastStore((st) => st.clearPulse);
  const isSel = selected?.kind === 'zone' && selected.id === zone.zoneKey;
  const pulsing = pulseZone === zone.zoneKey;
  const t = zone.tCrit?.used_h;

  useEffect(() => {
    if (!pulsing) return undefined;
    const timer = setTimeout(clearPulse, 1300);
    return () => clearTimeout(timer);
  }, [pulsing, clearPulse]);

  return (
    <li>
      <button
        type="button"
        className={`${s.zoneRow} ${pulsing ? s.pulse : ''}`}
        aria-pressed={isSel}
        onClick={() => select('zone', zone.zoneKey)}
        onMouseEnter={() => hover('zone', zone.zoneKey)}
        onMouseLeave={() => hover(null)}
        onFocus={() => hover('zone', zone.zoneKey)}
        onBlur={() => hover(null)}
      >
        <TierBadge tier={zone.severity?.tier} compact />
        <span className={s.key}>{zone.zoneKey}</span>
        <span className={`${s.limit} ${t != null && t < 24 ? s.limitSoon : ''}`}>
          {limitText(t) ?? zone.severity?.tier}
        </span>
        <span className={s.metrics}>
          <span>
            peak <Value value={zone.peakSinking_mm} unit="mm" />
          </span>
          <span>
            <Value value={zone.maxSpeed_mmPerDay} unit="mm/day" />
          </span>
        </span>
      </button>
    </li>
  );
}

export function ZoneList() {
  const at = useTimeStore((st) => st.at);
  const zones = useZones(at);
  const { data: status } = useStatus();
  const hour12 = useUiStore((st) => st.settings.hour12);
  const sorted = sortZones(zones.data);
  const lastCheck = zones.data?.[0]?.createdAt ?? status?.updatedAt;

  let body;
  if (zones.isPending) body = <SkeletonRows rows={3} />;
  else if (zones.isError)
    body = <InlineError message="Could not load zones." onRetry={zones.refetch} />;
  else if (!sorted.length)
    body = (
      <EmptyState>No moving zones. Last check {formatTime(lastCheck, { hour12 })}.</EmptyState>
    );
  else
    body = (
      <ul className={s.list}>
        {sorted.map((z) => (
          <ZoneRow key={z.zoneKey} zone={z} />
        ))}
      </ul>
    );

  return (
    <Panel label="Moving zones" id="zones" scroll className={s.zones}>
      {body}
    </Panel>
  );
}
