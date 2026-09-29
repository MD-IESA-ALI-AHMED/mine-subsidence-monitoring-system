import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../utils/format.js';
import s from './Value.module.css';

/**
 * A number with its unit in muted text one step smaller ("42.0 mm"). The number updates in place;
 * when it changes it gets a faint background tint for 600 ms (no count-up animation).
 */
export function Value({ value, unit, decimals, size, className = '', title }) {
  const text = formatNumber(value, decimals);
  const prev = useRef(text);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (prev.current === text) return undefined;
    prev.current = text;
    setChanged(true);
    const t = setTimeout(() => setChanged(false), 600);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <span
      className={`${s.value} ${changed ? s.changed : ''} ${size ? s[size] : ''} ${className}`}
      title={title}
    >
      {text}
      {unit && value != null && <span className={s.unit}>{unit}</span>}
    </span>
  );
}
