import { NODE_TYPE_LABELS, TIER_LABELS, isRelayType } from '@subsidence/shared';
import { useNavigate } from 'react-router-dom';
import { useNode } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { Button } from '../../ui/Button.jsx';
import { InlineError, Panel, SkeletonRows } from '../../ui/Panel.jsx';
import { Value } from '../../ui/Value.jsx';
import { tiltValue, volts } from '../../utils/format.js';
import { formatFull, formatRelative } from '../../utils/time.js';
import s from '../overview/ContextPanel.module.css';
import { NodeCharts } from './NodeCharts.jsx';

const STATUS_TEXT = {
  online: 'online',
  offline: 'offline',
  silent_after_rise: 'silent after rising',
};

function Tilt({ urad, mode }) {
  const t = tiltValue(urad, mode);
  const deg = tiltValue(urad, 'deg');
  return (
    <Value
      value={t.value}
      unit={t.unit}
      decimals={t.decimals}
      title={deg.value != null ? `${deg.value.toFixed(3)}°` : undefined}
    />
  );
}

/** Header, key values, path to root, three synced history charts, and actions. */
export function NodeDetail({ nodeId, listed }) {
  const q = useNode(nodeId);
  const now = useSiteNow();
  const tiltMode = useUiStore((st) => st.settings.tiltUnit);
  const select = useSelectionStore((st) => st.select);
  const navigate = useNavigate();

  if (q.isPending)
    return (
      <Panel>
        <SkeletonRows rows={8} />
      </Panel>
    );
  if (q.isError)
    return (
      <Panel>
        <InlineError message={`Could not load ${nodeId}.`} onRetry={q.refetch} />
      </Panel>
    );

  const n = { ...q.data, ...(listed ?? {}) };
  const v = n.latest ?? {};
  const relay = isRelayType(n.type);
  const path = q.data.meshPath ?? [];

  return (
    <>
      <Panel>
        <p className={s.meta}>
          {NODE_TYPE_LABELS[n.type]} · {STATUS_TEXT[n.status] ?? n.status}
          {n.zoneKey && ` · ${n.zoneKey} ${TIER_LABELS[n.tier]?.toLowerCase() ?? ''}`}
          {' · last seen '}
          <span title={formatFull(n.lastSeenAt)}>{formatRelative(n.lastSeenAt, now)}</span>
        </p>
      </Panel>
      <Panel label="Now">
        <dl className={`${s.kv} ${s.kv2}`}>
          {!relay && (
            <>
              <dt>Sinking</dt>
              <dd>
                <Value value={v.sinking_mm} unit="mm" />
              </dd>
              <dt>Speed</dt>
              <dd>
                <Value value={v.speed_mmPerDay} unit="mm/day" />
              </dd>
              <dt>Tilt x</dt>
              <dd>
                <Tilt urad={v.tiltX_urad} mode={tiltMode} />
              </dd>
              <dt>Tilt y</dt>
              <dd>
                <Tilt urad={v.tiltY_urad} mode={tiltMode} />
              </dd>
              {n.hasRod && (
                <>
                  <dt>Rod</dt>
                  <dd>
                    <Value value={v.rod_mm} unit="mm" />
                  </dd>
                </>
              )}
              <dt>Temperature</dt>
              <dd>
                <Value value={v.temp_C ?? q.data.reading?.temp_C} unit="°C" decimals={1} />
              </dd>
            </>
          )}
          <dt>Battery</dt>
          <dd>
            <Value value={n.battery?.pct} unit="%" decimals={0} />{' '}
            <Value value={volts(n.battery?.mV)} unit="V" decimals={2} />
          </dd>
          <dt>Signal</dt>
          <dd>
            <Value value={n.rssi_dBm} unit="dBm" decimals={0} />
          </dd>
          {!relay && (
            <>
              <dt>Parent relay</dt>
              <dd>{n.parentRelayId}</dd>
              <dt>Backup relay</dt>
              <dd>{n.backupRelayId}</dd>
            </>
          )}
          {relay && (
            <>
              <dt>Mesh layer</dt>
              <dd>{n.meshLayer ?? '—'}</dd>
            </>
          )}
          <dt>Fast mode</dt>
          <dd>{n.fastMode ? 'on (1 min)' : 'off'}</dd>
        </dl>
      </Panel>
      <Panel label="Path to root">
        <p className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
          {path.map((id, i) => (
            <span key={id}>
              {i > 0 && ' → '}
              {i === 0 ? (
                id
              ) : (
                <button type="button" className={s.linkish} onClick={() => select('node', id)}>
                  {id}
                </button>
              )}
            </span>
          ))}
        </p>
      </Panel>
      {!relay && (
        <Panel label="History">
          <NodeCharts nodeId={n.id} />
        </Panel>
      )}
      <Panel>
        <div className={s.actions}>
          <Button size="small" onClick={() => navigate(`/network?node=${n.id}`)}>
            Show on network page
          </Button>
        </div>
      </Panel>
    </>
  );
}
