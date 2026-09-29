import { TIER_LABELS, TIER_SHAPES } from '@subsidence/shared';
import s from './TierBadge.module.css';

/** Tier as shape + word (never colour alone). `compact` shows the shape only, with a label. */
export function TierBadge({ tier, compact = false, boxed = false, className = '' }) {
  if (!tier) return null;
  const label = TIER_LABELS[tier] ?? tier;
  return (
    <span
      className={`${s.badge} ${s[tier] ?? ''} ${boxed ? s.boxed : ''} ${className}`}
      aria-label={compact ? `Tier: ${label}` : undefined}
      title={compact ? label : undefined}
    >
      <span className={s.shape} aria-hidden>
        {TIER_SHAPES[tier]}
      </span>
      {!compact && <span>{label.toLowerCase()}</span>}
    </span>
  );
}

export const tierClass = (tier) => s[tier] ?? '';
