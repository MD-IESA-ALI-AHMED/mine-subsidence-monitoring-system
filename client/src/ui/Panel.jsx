import { Button } from './Button.jsx';
import s from './Panel.module.css';

/** A titled section: 11 px uppercase label, optional actions, body. Sections are divided by 1 px lines. */
export function Panel({
  label,
  actions,
  children,
  scroll = false,
  className = '',
  bodyClassName = '',
  id,
}) {
  const headingId = id ? `${id}-label` : undefined;
  return (
    <section className={`${s.section} ${s.divided} ${className}`} aria-labelledby={headingId}>
      {(label || actions) && (
        <div className={s.header}>
          {label && (
            <h2 className="section-label" id={headingId}>
              {label}
            </h2>
          )}
          {actions}
        </div>
      )}
      <div className={`${s.body} ${scroll ? s.scroll : ''} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Label above a value (the value is usually a <Value>). */
export function Stat({ label, children, sub }) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span>{children}</span>
      {sub && <span className={s.statSub}>{sub}</span>}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 12, style }) {
  return <span className={s.skeleton} style={{ width, height, ...style }} aria-hidden />;
}

export function SkeletonRows({ rows = 3, gap = 12 }) {
  return (
    <div style={{ display: 'grid', gap }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} width={`${90 - i * 12}%`} />
      ))}
    </div>
  );
}

/** One quiet line; never an illustration. */
export function EmptyState({ children }) {
  return <p className={s.empty}>{children}</p>;
}

/** Inline error for one region, with a retry. Never a full-page error for one failed request. */
export function InlineError({ message = 'Could not load this.', onRetry }) {
  return (
    <div className={s.error} role="alert">
      <span>{message}</span>
      {onRetry && (
        <Button size="small" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
