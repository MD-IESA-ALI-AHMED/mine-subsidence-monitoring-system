import { isGroundSensorType } from '@subsidence/shared';
import { useNodes, useStatus, useZones } from '../../services/queries.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { Panel, SkeletonRows, Stat } from '../../ui/Panel.jsx';
import { TierBadge } from '../../ui/TierBadge.jsx';
import { Value } from '../../ui/Value.jsx';
import { limitText } from '../../utils/time.js';
import s from '../overview/ContextPanel.module.css';
import { highestRisk } from '../zones/zoneOrder.js';

const maxBy = (arr, f) =>
  arr.reduce((best, x) => (f(x) != null && (best == null || f(x) > f(best)) ? x : best), null);

/** Exactly four stats. The 7-day site speed chart below them arrives with the charts (phase 7). */
export function SiteSummary() {
  const at = useTimeStore((st) => st.at);
  const nodes = useNodes(at);
  const zones = useZones(at);
  const { data: status } = useStatus();
  const select = useSelectionStore((st) => st.select);

  if (nodes.isPending || zones.isPending) {
    return (
      <Panel>
        <SkeletonRows rows={4} />
      </Panel>
    );
  }

  const ground = (nodes.data ?? []).filter((n) => isGroundSensorType(n.type));
  const risk = highestRisk(zones.data);
  const deepest = maxBy(ground, (n) => n.latest?.sinking_mm);
  const fastest = maxBy(ground, (n) => n.latest?.speed_mmPerDay);
  const online = (nodes.data ?? []).filter((n) => n.status === 'online').length;
  const nodeLink = (n) => (
    <button type="button" className={s.linkish} onClick={() => select('node', n.id)}>
      {n.id}
    </button>
  );

  return (
    <Panel>
      <div className={s.grid2}>
        <Stat label="Highest risk" sub={limitText(risk?.tCrit?.used_h) ?? 'no limit in sight'}>
          {risk ? (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline' }}>
              <button
                type="button"
                className={s.linkish}
                onClick={() => select('zone', risk.zoneKey)}
              >
                <span className="mono" style={{ fontSize: 'var(--fs-lg)' }}>
                  {risk.zoneKey}
                </span>
              </button>
              <TierBadge tier={risk.severity.tier} />
            </span>
          ) : (
            'None'
          )}
        </Stat>
        <Stat label="Deepest sinking" sub={deepest && nodeLink(deepest)}>
          <Value value={deepest?.latest?.sinking_mm} unit="mm" size="xl" />
        </Stat>
        <Stat label="Fastest point" sub={fastest && nodeLink(fastest)}>
          <Value value={fastest?.latest?.speed_mmPerDay} unit="mm/day" size="xl" />
        </Stat>
        <Stat label="Network" sub={`root ${status?.rootId ?? '—'}`}>
          <span className="mono" style={{ fontSize: 'var(--fs-xl)' }}>
            {online}
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)' }}>
              {' '}
              / {nodes.data?.length ?? 0}
            </span>
          </span>
        </Stat>
      </div>
    </Panel>
  );
}
