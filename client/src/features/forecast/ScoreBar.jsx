import s from './ScoreBar.module.css';

export const PART_LABELS = {
  sinking: 'Sinking beyond expected',
  speed: 'Speed',
  accel: 'Speeding up',
  extent: 'Size of zone',
  deviation: 'Difference from expected',
  proximity: 'Near the village',
};

// Parts share the zone's tier hue, stepping down in strength so the bar reads as one quantity.
const STRENGTH = [1, 0.8, 0.64, 0.5, 0.38, 0.28];
const CUTOFFS = [25, 45, 70];

/** Why the tier was assigned: the six severity parts as one stacked bar on a 0–100 scale. */
export function ScoreBar({ severity }) {
  if (!severity) return null;
  const parts = Object.entries(severity.parts ?? {});
  const tierColor = `var(--tier-${severity.tier})`;
  return (
    <div className={s.wrap} style={{ '--tier-color': tierColor }}>
      <div className={s.total}>
        Score {severity.score} of 100
        {severity.overrides?.length ? ` · raised: ${severity.overrides.join(', ')}` : ''}
      </div>
      <div className={s.bar} role="img" aria-label={`Danger score ${severity.score} of 100`}>
        {parts.map(([k, v], i) =>
          v > 0 ? (
            <span
              key={k}
              className={s.segment}
              style={{ width: `${v}%`, opacity: STRENGTH[i] }}
              title={`${PART_LABELS[k]}: ${v}`}
            />
          ) : null,
        )}
        {CUTOFFS.map((c) => (
          <span key={c} className={s.cut} style={{ left: `${c}%` }} aria-hidden />
        ))}
      </div>
      <div className={s.scale} aria-hidden>
        {[0, ...CUTOFFS, 100].map((c) => (
          <span key={c} style={{ left: `${c}%` }}>
            {c}
          </span>
        ))}
      </div>
      <ul className={s.legend}>
        {parts.map(([k, v], i) => (
          <li key={k} style={{ display: 'contents' }}>
            <span className={s.swatch} style={{ opacity: STRENGTH[i] }} aria-hidden />
            <span>{PART_LABELS[k]}</span>
            <span className={s.points}>{v.toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
