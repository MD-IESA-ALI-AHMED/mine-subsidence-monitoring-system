import { scaleLinear } from 'd3-scale';
import s from '../charts/Charts.module.css';
import { formatHours } from '../../utils/time.js';

const W = 300;
const H = 170;
const PAD = { l: 38, r: 10, t: 12, b: 20 };
const HOUR_MS = 3_600_000;

const pathOf = (pts) =>
  pts.length ? `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}` : '';

/** Forecast points from the prediction's creation time: [{ t, p10, p50, p90 }], starting at current. */
export function forecastPoints(nodeForecast, createdAt) {
  if (!nodeForecast?.horizons?.length || nodeForecast.current_mm == null) return [];
  const t0 = new Date(createdAt).getTime();
  const c = nodeForecast.current_mm;
  return [
    { t: t0, p10: c, p50: c, p90: c },
    ...nodeForecast.horizons.map((h) => ({
      t: t0 + h.h * HOUR_MS,
      p10: h.p10_mm,
      p50: h.p50_mm,
      p90: h.p90_mm,
    })),
  ];
}

/**
 * Observed sinking (48 h, solid), forecast median (72 h, dashed), p10–p90 band (flat fill, same
 * hue), a "now" line, the limit (dashed) and a marker at the time to limit used for alerts.
 * observed: { t: [ms], v: [mm] }; limit_mm: absolute sinking at which the limit is reached.
 */
export function ForecastChart({ observed, forecast, now, limit_mm, tCrit_h, label }) {
  const nowMs = now.getTime();
  const x = scaleLinear()
    .domain([nowMs - 48 * HOUR_MS, nowMs + 72 * HOUR_MS])
    .range([PAD.l, W - PAD.r]);
  const values = [
    ...observed.v.filter((v) => v != null),
    ...forecast.flatMap((p) => [p.p10, p.p90]),
    ...(limit_mm != null ? [limit_mm] : []),
  ];
  const lo = Math.min(...values, 0);
  const hi = Math.max(...values, 1);
  // Sinking is drawn downward, like the ground.
  const y = scaleLinear()
    .domain([lo, hi * 1.06])
    .range([PAD.t, H - PAD.b])
    .nice();

  const obs = observed.t
    .map((t, i) => [t, observed.v[i]])
    .filter(([t, v]) => v != null && t >= x.domain()[0]);
  const band = forecast.length
    ? `${pathOf(forecast.map((p) => [x(p.t), y(p.p90)]))}L${[...forecast]
        .reverse()
        .map((p) => `${x(p.t).toFixed(1)},${y(p.p10).toFixed(1)}`)
        .join('L')}Z`
    : '';
  const marker = tCrit_h != null && limit_mm != null ? nowMs + tCrit_h * HOUR_MS : null;
  const hours = [-48, -24, 0, 24, 48, 72];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label={label}>
      {y.ticks(4).map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={PAD.l - 4} y={y(t) + 3} textAnchor="end" className={s.axisText}>
            {t}
          </text>
        </g>
      ))}
      {hours.map((h) => (
        <text
          key={h}
          x={x(nowMs + h * HOUR_MS)}
          y={H - 6}
          textAnchor="middle"
          className={s.axisText}
        >
          {h === 0 ? 'now' : `${h > 0 ? '+' : ''}${h} h`}
        </text>
      ))}
      {band && <path d={band} fill="var(--tier-watch)" fillOpacity="0.16" stroke="none" />}
      <path
        d={pathOf(obs.map(([t, v]) => [x(t), y(v)]))}
        fill="none"
        stroke="var(--text)"
        strokeWidth="1.5"
      />
      {forecast.length > 0 && (
        <path
          d={pathOf(forecast.map((p) => [x(p.t), y(p.p50)]))}
          fill="none"
          stroke="var(--tier-watch)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      )}
      <line x1={x(nowMs)} x2={x(nowMs)} y1={PAD.t} y2={H - PAD.b} stroke="var(--line-strong)" />
      {limit_mm != null && (
        <g>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(limit_mm)}
            y2={y(limit_mm)}
            stroke="var(--tier-critical)"
            strokeDasharray="5 3"
          />
          <text
            x={PAD.l + 2}
            y={y(limit_mm) - 3}
            className={s.axisText}
            style={{ fill: 'var(--tier-critical)' }}
          >
            limit
          </text>
        </g>
      )}
      {marker != null && marker <= x.domain()[1] && (
        <g>
          <circle cx={x(marker)} cy={y(limit_mm)} r="4" fill="var(--tier-critical)" />
          <text x={Math.min(x(marker), W - PAD.r - 70)} y={y(limit_mm) + 14} className={s.markText}>
            {tCrit_h <= 0.05 ? 'limit reached' : `limit in ${formatHours(tCrit_h)}`}
          </text>
        </g>
      )}
      <text x={PAD.l} y={PAD.t - 3} className={s.axisText}>
        mm, down
      </text>
    </svg>
  );
}
