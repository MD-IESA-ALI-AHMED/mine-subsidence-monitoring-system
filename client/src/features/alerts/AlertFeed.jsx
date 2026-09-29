import { Link } from 'react-router-dom';
import { useAlerts, useEvents } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { TierBadge } from '../../ui/TierBadge.jsx';
import { EmptyState, InlineError, Panel, SkeletonRows } from '../../ui/Panel.jsx';
import { DAY_MS, HOUR_MS, formatFeedTime, formatFull } from '../../utils/time.js';
import s from '../overview/Rail.module.css';
import { feedItems } from './feedItems.js';

export function AlertFeed() {
  const now = useSiteNow();
  // Query window moves once an hour, so the list is not refetched every second.
  const to = Math.ceil(now.getTime() / HOUR_MS) * HOUR_MS;
  const alerts = useAlerts({ limit: 40 });
  const events = useEvents(to - 7 * DAY_MS, to);
  const select = useSelectionStore((st) => st.select);
  const hour12 = useUiStore((st) => st.settings.hour12);
  const items = feedItems(alerts.data, events.data);

  let body;
  if (alerts.isPending) body = <SkeletonRows rows={5} />;
  else if (alerts.isError)
    body = <InlineError message="Could not load alerts." onRetry={alerts.refetch} />;
  else if (!items.length) body = <EmptyState>Nothing to report.</EmptyState>;
  else
    body = (
      <ol className={s.list} aria-live="polite" style={{ margin: 0 }}>
        {items.map((it) => {
          const target = it.zoneKey ? ['zone', it.zoneKey] : it.nodeId ? ['node', it.nodeId] : null;
          const text = target ? (
            <button
              type="button"
              className={`${s.feedText} ${s.feedButton}`}
              onClick={() => select(...target)}
            >
              {it.text}
            </button>
          ) : (
            <span className={s.feedText}>{it.text}</span>
          );
          return (
            <li key={it.id} className={`${s.feedItem} ${it.state === 'resolved' ? s.acked : ''}`}>
              <time className={s.feedTime} dateTime={it.ts} title={formatFull(it.ts)}>
                {formatFeedTime(it.ts, now, { hour12 })}
              </time>
              {it.kind === 'alert' ? (
                <TierBadge tier={it.tier} compact />
              ) : (
                <span className={s.eventMark} aria-hidden>
                  ·
                </span>
              )}
              {text}
            </li>
          );
        })}
      </ol>
    );

  return (
    <Panel
      label="Alert feed"
      id="feed"
      scroll
      className={s.feed}
      actions={
        <Link to="/alerts" className={s.viewAll}>
          View all
        </Link>
      }
    >
      {body}
    </Panel>
  );
}
