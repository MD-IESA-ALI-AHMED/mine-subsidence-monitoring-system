import { useLatestPrediction, useNodes, useStatus } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { EmptyState, Panel } from '../../ui/Panel.jsx';
import { Table } from '../../ui/Table.jsx';
import { Value } from '../../ui/Value.jsx';
import { formatHours, formatRelative, formatTime } from '../../utils/time.js';
import s from '../overview/ContextPanel.module.css';
import { ScoreBar } from './ScoreBar.jsx';

function TimeToLimit({ tCrit }) {
  const { data: prediction } = useLatestPrediction();
  const { data: status } = useStatus();
  const now = useSiteNow();
  const hour12 = useUiStore((st) => st.settings.hour12);
  const used = tCrit?.method;
  const mark = (m) => (used === m ? ' ← used for alerts' : '');
  const unreachable = status?.model?.reachable === false;
  return (
    <>
      <dl className={s.kv}>
        <dt>Model{mark('model')}</dt>
        <dd>
          {tCrit?.model_h != null
            ? tCrit.model_h <= 0.05
              ? 'reached'
              : formatHours(tCrit.model_h)
            : 'no limit in 72 h'}
        </dd>
        <dt>Inverse velocity{mark('inverse_velocity')}</dt>
        <dd>
          {tCrit?.inverseVelocity_h != null
            ? formatHours(tCrit.inverseVelocity_h)
            : 'not speeding up'}
        </dd>
      </dl>
      {prediction && (
        <p className={s.note} style={{ marginTop: 8 }}>
          {prediction.modelVersion} · forecast {formatRelative(prediction.createdAt, now)}
          {unreachable &&
            ` · Model unreachable — showing forecast from ${formatTime(status.model.lastGoodAt ?? prediction.createdAt, { hour12 })}`}
        </p>
      )}
    </>
  );
}

/** Header facts, time to limit, score breakdown and nodes. Forecast charts arrive in phase 7. */
export function ZoneDetail({ zoneKey, zone }) {
  const at = useTimeStore((st) => st.at);
  const { data: nodes } = useNodes(at);
  const select = useSelectionStore((st) => st.select);

  if (!zone)
    return (
      <Panel>
        <EmptyState>{zoneKey} is not active at this time.</EmptyState>
      </Panel>
    );

  const members = (nodes ?? []).filter((n) => zone.nodeIds.includes(n.id));
  return (
    <>
      <Panel>
        <p className={s.meta}>
          {zone.nodeIds.length} nodes · {Math.round(zone.area_m2)} m² ·{' '}
          {zone.accelerating ? 'accelerating' : 'steady'}
        </p>
      </Panel>
      <Panel label="Time to limit">
        <TimeToLimit tCrit={zone.tCrit} />
      </Panel>
      <Panel label="Why this tier">
        <ScoreBar severity={zone.severity} />
      </Panel>
      <Panel label="Nodes">
        <Table
          label={`Nodes in ${zoneKey}`}
          rowKey={(n) => n.id}
          rows={members}
          onRowClick={(n) => select('node', n.id)}
          initialSort={{ key: 'sinking', dir: -1 }}
          columns={[
            { key: 'id', label: 'ID', render: (n) => <span className="mono">{n.id}</span> },
            {
              key: 'sinking',
              label: 'Sinking',
              numeric: true,
              sortValue: (n) => n.latest?.sinking_mm,
              render: (n) => <Value value={n.latest?.sinking_mm} unit="mm" />,
            },
            {
              key: 'speed',
              label: 'Speed',
              numeric: true,
              sortValue: (n) => n.latest?.speed_mmPerDay,
              render: (n) => <Value value={n.latest?.speed_mmPerDay} unit="mm/day" />,
            },
          ]}
        />
      </Panel>
    </>
  );
}
