import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button, IconButton } from '../../ui/Button.jsx';
import { TierBadge, tierClass } from '../../ui/TierBadge.jsx';
import s from './Toasts.module.css';

const LIFETIME_MS = { critical: 8000, warning: 6000 };

function Toast({ toast }) {
  const dismiss = useToastStore((st) => st.dismiss);
  const select = useSelectionStore((st) => st.select);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), LIFETIME_MS[toast.tier] ?? 6000);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  const goToZone = () => {
    select('zone', toast.zoneKey);
    navigate('/');
    dismiss(toast.id);
  };

  return (
    <div
      className={`${s.toast} ${tierClass(toast.tier)}`}
      style={{ '--tier-color': `var(--tier-${toast.tier})` }}
    >
      <TierBadge tier={toast.tier} compact />
      <span className={s.title}>{toast.title}</span>
      <IconButton icon={X} label="Dismiss" size="small" onClick={() => dismiss(toast.id)} />
      {toast.body && <p className={s.body}>{toast.body}</p>}
      {toast.zoneKey && !toast.zoneKey.startsWith('node:') && (
        <div className={s.actions}>
          <Button size="small" onClick={goToZone}>
            Go to zone
          </Button>
        </div>
      )}
    </div>
  );
}

/** New warning and critical alerts only. Critical ones are announced assertively. */
export function Toasts() {
  const toasts = useToastStore((st) => st.toasts);
  const critical = toasts.filter((t) => t.tier === 'critical');
  const other = toasts.filter((t) => t.tier !== 'critical');
  return (
    <div className={s.stack}>
      <div role="alert" aria-live="assertive">
        {critical.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </div>
      <div aria-live="polite">
        {other.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}
