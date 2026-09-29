import { NODE_TYPE_LABELS } from '@subsidence/shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLinks, useNodes } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { InlineError, Panel, SkeletonRows } from '../../ui/Panel.jsx';
import { Table } from '../../ui/Table.jsx';
import { Value } from '../../ui/Value.jsx';
import { formatFull, formatRelative } from '../../utils/time.js';
import { MeshTree } from './MeshTree.jsx';
import s from './NetworkPage.module.css';

const STATUS = {
  online: { text: 'online', cls: s.muted },
  offline: { text: 'offline', cls: s.warn },
  silent_after_rise: { text: 'silent after rising', cls: s.crit },
};

export default function NetworkPage() {
  const nodes = useNodes();
  const links = useLinks();
  const now = useSiteNow();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const select = useSelectionStore((st) => st.select);

  const open = (n) => {
    select('node', n.id);
    navigate('/');
  };

  const columns = [
    { key: 'id', label: 'ID', render: (n) => <span className="mono">{n.id}</span> },
    { key: 'type', label: 'Type', render: (n) => NODE_TYPE_LABELS[n.type] },
    {
      key: 'status',
      label: 'Status',
      render: (n) => (
        <span className={STATUS[n.status]?.cls}>{STATUS[n.status]?.text ?? n.status}</span>
      ),
    },
    {
      key: 'battery',
      label: 'Battery',
      numeric: true,
      sortValue: (n) => n.battery?.pct,
      render: (n) => <Value value={n.battery?.pct} unit="%" decimals={0} />,
    },
    {
      key: 'rssi',
      label: 'Signal',
      numeric: true,
      sortValue: (n) => n.rssi_dBm,
      render: (n) => <Value value={n.rssi_dBm} unit="dBm" decimals={0} />,
    },
    {
      key: 'parentRelayId',
      label: 'Parent relay',
      render: (n) => <span className="mono">{n.parentRelayId ?? n.meshParentId ?? '—'}</span>,
    },
    { key: 'meshLayer', label: 'Mesh layer', numeric: true, render: (n) => n.meshLayer ?? '—' },
    {
      key: 'lastSeenAt',
      label: 'Last seen',
      sortValue: (n) => (n.lastSeenAt ? new Date(n.lastSeenAt).getTime() : 0),
      render: (n) => (
        <span title={formatFull(n.lastSeenAt)}>{formatRelative(n.lastSeenAt, now)}</span>
      ),
    },
    {
      key: 'fastMode',
      label: 'Fast mode',
      sortValue: (n) => (n.fastMode ? 1 : 0),
      render: (n) => (n.fastMode ? 'on' : 'off'),
    },
  ];

  return (
    <div className={s.page}>
      <div className={s.table}>
        {nodes.isPending && (
          <Panel>
            <SkeletonRows rows={10} />
          </Panel>
        )}
        {nodes.isError && (
          <Panel>
            <InlineError message="Could not load nodes." onRetry={nodes.refetch} />
          </Panel>
        )}
        {nodes.data && (
          <Table
            label="Nodes"
            columns={columns}
            rows={nodes.data}
            rowKey={(n) => n.id}
            onRowClick={open}
            selectedKey={params.get('node')}
            initialSort={{ key: 'id', dir: 1 }}
          />
        )}
      </div>
      <aside className={s.side} aria-label="Mesh tree">
        <Panel label="Mesh tree">
          {nodes.data && links.data ? (
            <MeshTree nodes={nodes.data} linkState={links.data} />
          ) : (
            <SkeletonRows rows={4} />
          )}
        </Panel>
        <Panel>
          <p className={s.muted} style={{ fontSize: 'var(--fs-xs)' }}>
            To spot weak links in 3D, open Overview and colour by Signal, Battery or Mesh layer.
          </p>
        </Panel>
      </aside>
    </div>
  );
}
