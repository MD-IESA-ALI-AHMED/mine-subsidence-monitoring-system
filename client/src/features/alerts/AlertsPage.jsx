import { useState } from 'react';
import { ALERT_STATES, TIERS, tierRank } from '@subsidence/shared';
import { useAlerts } from '../../services/queries.js';
import { useUiStore } from '../../store/uiStore.js';
import { Toggle } from '../../ui/Controls.jsx';
import { EmptyState, InlineError, Panel, SkeletonRows } from '../../ui/Panel.jsx';
import { Table } from '../../ui/Table.jsx';
import { TierBadge } from '../../ui/TierBadge.jsx';
import { formatDateTime, formatFull } from '../../utils/time.js';
import { AlertDrawer } from './AlertDrawer.jsx';
import s from './AlertsPage.module.css';

const STATE_TEXT = { open: 'Open', acknowledged: 'Acknowledged', resolved: 'Resolved' };

function toggleIn(list, v) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function AlertsPage() {
  const [states, setStates] = useState(['open', 'acknowledged']);
  const [tiers, setTiers] = useState([...TIERS]);
  const [openId, setOpenId] = useState(null);
  const hour12 = useUiStore((st) => st.settings.hour12);
  const q = useAlerts({ state: states, tier: tiers, limit: 500 });
  const open = q.data?.find((a) => a._id === openId);

  const columns = [
    {
      key: 'createdAt',
      label: 'Time',
      sortValue: (a) => new Date(a.createdAt).getTime(),
      render: (a) => (
        <time className="mono" dateTime={a.createdAt} title={formatFull(a.createdAt)}>
          {formatDateTime(a.createdAt, { hour12 })}
        </time>
      ),
    },
    {
      key: 'tier',
      label: 'Tier',
      sortValue: (a) => tierRank(a.tier),
      render: (a) => <TierBadge tier={a.tier} />,
    },
    {
      key: 'zone',
      label: 'Zone',
      sortValue: (a) => a.zoneKey,
      render: (a) => (
        <span className="mono">{a.kind === 'inspect_node' ? a.nodeIds?.[0] : a.zoneKey}</span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      sortable: false,
      render: (a) => <span className={s.reason}>{a.reason}</span>,
    },
    {
      key: 'state',
      label: 'State',
      render: (a) => (
        <span className={a.state === 'open' ? s.stateOpen : s.stateMuted}>
          {STATE_TEXT[a.state]}
        </span>
      ),
    },
    {
      key: 'ack',
      label: 'Acknowledged by',
      sortValue: (a) => a.acknowledgedBy ?? '',
      render: (a) =>
        a.acknowledgedBy ? (
          <span title={formatFull(a.acknowledgedAt)}>
            {a.acknowledgedBy} ·{' '}
            <span className="mono">{formatDateTime(a.acknowledgedAt, { hour12 })}</span>
          </span>
        ) : (
          <span className={s.stateMuted}>—</span>
        ),
    },
  ];

  let body;
  if (q.isPending)
    body = (
      <Panel>
        <SkeletonRows rows={8} />
      </Panel>
    );
  else if (q.isError)
    body = (
      <Panel>
        <InlineError message="Could not load alerts." onRetry={q.refetch} />
      </Panel>
    );
  else if (!q.data.length)
    body = (
      <Panel>
        <EmptyState>No alerts match these filters.</EmptyState>
      </Panel>
    );
  else
    body = (
      <Table
        label="Alerts"
        columns={columns}
        rows={q.data}
        rowKey={(a) => a._id}
        onRowClick={(a) => setOpenId(a._id)}
        selectedKey={openId}
        initialSort={{ key: 'createdAt', dir: -1 }}
      />
    );

  return (
    <div className={s.page}>
      <div className={s.filters}>
        <div className={s.group} role="group" aria-label="State">
          <span className="section-label">State</span>
          {ALERT_STATES.map((st) => (
            <Toggle
              key={st}
              label={STATE_TEXT[st]}
              checked={states.includes(st)}
              onChange={() => setStates((l) => toggleIn(l, st))}
            />
          ))}
        </div>
        <div className={s.group} role="group" aria-label="Tier">
          <span className="section-label">Tier</span>
          {TIERS.map((t) => (
            <Toggle
              key={t}
              label={<TierBadge tier={t} />}
              checked={tiers.includes(t)}
              onChange={() => setTiers((l) => toggleIn(l, t))}
            />
          ))}
        </div>
        <span className={s.count}>{q.data ? `${q.data.length} alerts` : ''}</span>
      </div>
      <div className={s.tableWrap}>{body}</div>
      {open && <AlertDrawer key={open._id} alert={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
