import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import s from './Charts.module.css';

/**
 * Thin React wrapper around uPlot: creates the chart once per `options` identity, pushes new data
 * in place, follows the container's width, and destroys the chart on unmount.
 * `options` must be memoised by the caller; `data` is uPlot's aligned [xs, ...ys] (x in seconds).
 */
export function UPlotChart({ options, data, height = 120, label }) {
  const box = useRef(null);
  const plot = useRef(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const u = new uPlot({ ...options, width: el.clientWidth || 300, height }, data, el);
    plot.current = u;
    const ro = new ResizeObserver(() => u.setSize({ width: el.clientWidth, height }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      u.destroy();
      plot.current = null;
    };
    // Recreate only when the chart definition changes; data updates go through setData below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, height]);

  useEffect(() => {
    plot.current?.setData(data);
  }, [data]);

  return <div ref={box} className={s.uplot} role="img" aria-label={label} />;
}

/**
 * Draws events as thin vertical ticks and reports the event nearest the cursor (within 4 px),
 * so the caller can show its label. events: [{ t (s), label }].
 */
export function eventTicksPlugin(events, colour, onNearest) {
  return {
    hooks: {
      draw: [
        (u) => {
          const { ctx, bbox } = u;
          ctx.save();
          ctx.strokeStyle = colour;
          ctx.lineWidth = 1 * devicePixelRatio;
          for (const e of events) {
            const x = Math.round(u.valToPos(e.t, 'x', true));
            if (x < bbox.left || x > bbox.left + bbox.width) continue;
            ctx.beginPath();
            ctx.moveTo(x, bbox.top);
            ctx.lineTo(x, bbox.top + bbox.height);
            ctx.stroke();
          }
          ctx.restore();
        },
      ],
      setCursor: [
        (u) => {
          const left = u.cursor.left;
          if (left == null || left < 0) return onNearest(null);
          let best = null;
          for (const e of events) {
            const d = Math.abs(u.valToPos(e.t, 'x') - left);
            if (d <= 4 && (!best || d < best.d)) best = { d, e };
          }
          return onNearest(best?.e ?? null);
        },
      ],
    },
  };
}
