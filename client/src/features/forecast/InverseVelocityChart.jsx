import { scaleLinear } from 'd3-scale';
import s from '../charts/Charts.module.css';
import { formatHours } from '../../utils/time.js';

const W = 300;
const H = 140;
const PAD = { l: 44, r: 12, t: 10, b: 20 };

/**
 * Points of 1/speed over the last 36 h, with the fitted straight line extended to where it meets
 * zero (the expected failure time). iv: { points: [[tHours, 1/speed]], slope, intercept }.
 */
export function InverseVelocityChart({ iv }) {
  const pts = iv?.points ?? [];
  const falling = iv?.slope != null && iv.slope < 0 && iv.intercept > 0;
  const tZero = falling ? -iv.intercept / iv.slope : null;
  const xMax = Math.max(4, tZero != null ? Math.min(tZero * 1.1, 120) : 4);
  const x = scaleLinear()
    .domain([-36, xMax])
    .range([PAD.l, W - PAD.r]);
  const yMax = Math.max(...pts.map((p) => p[1]), falling ? iv.intercept : 0, 0.01);
  const y = scaleLinear()
    .domain([0, yMax * 1.1])
    .range([H - PAD.b, PAD.t])
    .nice();

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="Inverse velocity">
        {y.ticks(3).map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={PAD.l - 4} y={y(t) + 3} textAnchor="end" className={s.axisText}>
              {t}
            </text>
          </g>
        ))}
        {[-36, -24, -12, 0].map((h) => (
          <text key={h} x={x(h)} y={H - 6} textAnchor="middle" className={s.axisText}>
            {h === 0 ? 'now' : `${h} h`}
          </text>
        ))}
        <line x1={x(0)} x2={x(0)} y1={PAD.t} y2={H - PAD.b} stroke="var(--line-strong)" />
        {pts.map(([t, v]) => (
          <circle key={t} cx={x(t)} cy={y(v)} r="2.2" fill="var(--text)" />
        ))}
        {falling && (
          <g>
            <line
              x1={x(-36)}
              y1={y(iv.intercept + iv.slope * -36)}
              x2={x(Math.min(tZero, xMax))}
              y2={y(Math.max(0, iv.intercept + iv.slope * Math.min(tZero, xMax)))}
              stroke="var(--tier-critical)"
              strokeWidth="1.5"
            />
            {tZero <= xMax && (
              <>
                <circle cx={x(tZero)} cy={y(0)} r="4" fill="var(--tier-critical)" />
                <text x={Math.min(x(tZero), W - 80)} y={y(0) - 8} className={s.markText}>
                  ≈ {formatHours(tZero)}
                </text>
              </>
            )}
          </g>
        )}
        <text x={PAD.l} y={PAD.t - 1} className={s.axisText}>
          1/speed, day/mm
        </text>
      </svg>
      <figcaption className={s.caption}>
        When ground speeds up before failing, 1/speed falls in a straight line. Where it reaches
        zero is the expected failure time.
        {!falling && pts.length > 0 && ' Here it is not falling, so this method gives no time.'}
      </figcaption>
    </figure>
  );
}
