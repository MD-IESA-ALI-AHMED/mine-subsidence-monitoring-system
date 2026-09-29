import { useState } from 'react';
import { errorMessage } from '../../services/api.js';
import { useAcknowledge, useResolve, useZones } from '../../services/queries.js';
import { useUiStore } from '../../store/uiStore.js';
import { Button } from '../../ui/Button.jsx';
import { Drawer } from '../../ui/Overlay.jsx';
import { Panel, EmptyState } from '../../ui/Panel.jsx';
import { TierBadge } from '../../ui/TierBadge.jsx';
import { formatDateTime } from '../../utils/time.js';
import { ZoneForecast } from '../forecast/ZoneForecast.jsx';
import s from './AlertsPage.module.css';

const MIN_NOTE = 5;
const ACTION_TEXT = { raised: 'Raised', acknowledge: 'Acknowledged', resolve: 'Resolved' };

/** Alert detail: timeline, small forecast chart, and Acknowledge / Resolve with a note. */
export function AlertDrawer({ alert, onClose }) {
  const [note, setNote] = useState('');
  const ack = useAcknowledge();
  const resolve = useResolve();
  const { data: zones } = useZones();
  const hour12 = useUiStore((st) => st.settings.hour12);
  const zone = zones?.find((z) => z.zoneKey === alert.zoneKey);
  const busy = ack.isPending || resolve.isPending;
  const error = ack.error ?? resolve.error;
  const noteOk = note.trim().length >= MIN_NOTE;

  const run = (mutation) =>
    mutation.mutate({ id: alert._id, note: note.trim() }, { onSuccess: () => setNote('') });

  return (
    <Drawer
      title={alert.title}
      badge={<TierBadge tier={alert.tier} boxed />}
      onClose={onClose}
      label={`Alert ${alert.title}`}
    >
      <Panel>
        <p style={{ color: 'var(--text-muted)' }}>{alert.reason}</p>
      </Panel>
      <Panel label="Timeline">
        <ol className={s.timeline}>
          {(alert.history ?? []).map((h) => (
            <li key={`${h.ts}-${h.action}`}>
              <time dateTime={h.ts}>{formatDateTime(h.ts, { hour12 })}</time>
              <span>
                {ACTION_TEXT[h.action] ?? h.action}
                {h.by && h.by !== 'system' ? ` by ${h.by}` : ''}
                {h.note && h.action !== 'raised' ? ` — “${h.note}”` : ''}
              </span>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel label="Forecast">
        {zone ? (
          <ZoneForecast zone={zone} />
        ) : (
          <EmptyState>{alert.zoneKey} is no longer an active zone.</EmptyState>
        )}
      </Panel>
      {alert.state !== 'resolved' && (
        <Panel label="Action">
          <label className="visually-hidden" htmlFor="alert-note">
            Note
          </label>
          <textarea
            id="alert-note"
            className={s.note}
            placeholder="What was checked or done (at least 5 characters)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
          <div className={s.actions}>
            {alert.state === 'open' && (
              <Button variant="primary" disabled={!noteOk || busy} onClick={() => run(ack)}>
                Acknowledge
              </Button>
            )}
            <Button disabled={!noteOk || busy} onClick={() => run(resolve)}>
              Resolve
            </Button>
          </div>
          {!noteOk && note.length > 0 && (
            <p className={s.hint}>A note of at least {MIN_NOTE} characters is required.</p>
          )}
          {error && (
            <p className={s.error} role="alert">
              {errorMessage(error)}
            </p>
          )}
        </Panel>
      )}
    </Drawer>
  );
}
