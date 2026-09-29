import { scaleLinear } from 'd3-scale';
import { TIER_SHAPES } from '@subsidence/shared';
import { useAlerts, useSpeedHistory } from '../../services/queries.js';
import { useSiteNow } from '../../store/liveStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { InlineError, SkeletonRows } from '../../ui/Panel.jsx';
import { DAY_MS, HOUR_MS, formatDateTime } from '../../utils/time.js';
import s from '../charts/Charts.module.css';

const W = 300;
const H = 120;
const PAD = { l: 34, r: 8, t: 16, b: 18 };

/** Maximum sinking speed across the site over the last 7 days, with alert times marked. */
export function SiteSpeedChart() {
  const at = useTimeStore((st) => st.at);
  const now = useSiteNow();
  const to = at ?? Math.ceil(now.getTime() / HOUR_MS) * HOUR_MS;
  const from = to - 7 * DAY_MS;
  const q = useSpeedHistory(from, to);
  const { data: alerts } = useAlerts({ limit: 200 });

  if (q.isError)
    return <InlineError message="Could not load the speed history." onRetry={q.refetch} />;
  if (q.isPending) return <SkeletonRows rows={3} />;

  const { t, maxSpeed } = q.data;
  const x = scaleLinear()
    .domain([from, to])
    .range([PAD.l, W - PAD.r]);
  const y = scaleLinear()
    .domain([0, Math.max(10, ...maxSpeed) * 1.05])
    .range([H - PAD.b, PAD.t])
    .nice();
  const d = t
    .map((ms, i) => `${i ? 'L' : 'M'}${x(ms).toFixed(1)},${y(maxSpeed[i]).toFixed(1)}`)
    .join('');
  const marks = (alerts ?? []).filter((a) => {
    const ms = new Date(a.createdAt).getTime();
    return ms >= from && ms <= to && a.kind === 'zone';
  });
  const days = Array.from({ length: 8 }, (_, i) => from + i * DAY_MS);

  return (
    <figure style={{ margin: 0 }}>
      <p className={s.chartTitle}>
        <strong>Fastest sinking on site, 7 days</strong>
        <span>mm/day</span>
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={s.svg}
        role="img"
        aria-label="Maximum sinking speed over the last 7 days"
      >
        {y.ticks(3).map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" className={s.axisText}>
              {v}
            </text>
          </g>
        ))}
        {days
          .filter((_, i) => i % 2 === 1)
          .map((ms) => (
            <text key={ms} x={x(ms)} y={H - 5} textAnchor="middle" className={s.axisText}>
              {formatDateTime(ms).split(' ').slice(0, 2).join(' ')}
            </text>
          ))}
        <path d={d} fill="none" stroke="var(--text)" strokeWidth="1.2" />
        {marks.map((a) => (
          <g key={a._id}>
            <title>{`${a.title} · ${formatDateTime(a.createdAt)}`}</title>
            <line
              x1={x(new Date(a.createdAt))}
              x2={x(new Date(a.createdAt))}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke={`var(--tier-${a.tier})`}
              strokeOpacity="0.6"
            />
            <text
              x={x(new Date(a.createdAt))}
              y={PAD.t - 4}
              textAnchor="middle"
              style={{ fill: `var(--tier-${a.tier})`, fontSize: 9 }}
            >
              {TIER_SHAPES[a.tier]}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
