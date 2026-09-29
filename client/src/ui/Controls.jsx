import { useId } from 'react';
import s from './Controls.module.css';

/** Radio group styled as joined buttons. options: [{ value, label }] */
export function SegmentedControl({ label, options, value, onChange, className = '' }) {
  const onKey = (e) => {
    const i = options.findIndex((o) => o.value === value);
    if (e.key === 'ArrowRight') onChange(options[(i + 1) % options.length].value);
    if (e.key === 'ArrowLeft') onChange(options[(i - 1 + options.length) % options.length].value);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${s.segmented} ${className}`}
      onKeyDown={onKey}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={s.segment}
          onClick={() => onChange(o.value)}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange, title }) {
  const id = useId();
  return (
    <label className={s.toggle} htmlFor={id} title={title}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={s.box} aria-hidden />
      <span className={s.toggleLabel}>{label}</span>
    </label>
  );
}

/** tabs: [{ value, label }] */
export function Tabs({ label, tabs, value, onChange }) {
  return (
    <div role="tablist" aria-label={label} className={s.tabs}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          className={s.tab}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ children, title }) {
  return (
    <span className={s.chip} title={title}>
      {children}
    </span>
  );
}
