import { useMemo } from 'react';
import { contourLines, sketchSurface } from './contourField.js';

/** Faint survey-style contour drawing (sign-in page background). Decorative. */
export function StaticContours({ className }) {
  const { paths, nx, ny } = useMemo(() => {
    const { values, nx: w, ny: h } = sketchSurface();
    const levels = Array.from({ length: 28 }, (_, i) => -1.6 + i * 0.12);
    const lines = contourLines(values, w, h, levels);
    return {
      nx: w,
      ny: h,
      paths: lines.flatMap((l, li) =>
        l.rings.map((ring, ri) => ({
          key: `${li}-${ri}`,
          major: li % 5 === 0,
          d: `M${ring.map(([x, y]) => `${x.toFixed(2)},${(h - y).toFixed(2)}`).join('L')}`,
        })),
      ),
    };
  }, []);
  return (
    <svg
      className={className}
      viewBox={`0 0 ${nx} ${ny}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={p.major ? 1.2 : 0.8}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
