import uPlot from 'uplot';
import { SITE_TIMEZONE } from '@subsidence/shared';
import { formatTime } from '../../utils/time.js';

const dayFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: SITE_TIMEZONE,
  day: 'numeric',
  month: 'short',
});
const formatDay = (ms) => dayFmt.format(new Date(ms));

const FONT = '10px "IBM Plex Mono", ui-monospace, monospace';

/** uPlot shows times in IST whatever the browser's time zone. */
export const tzDate = (ts) => uPlot.tzDate(new Date(ts * 1000), SITE_TIMEZONE);

/** Axis styled from theme tokens: muted labels, 1 px grid lines in --line, no heavy frame. */
export function axis(tokens, { label, values, size = 44, side } = {}) {
  return {
    ...(side != null && { side }),
    stroke: tokens.textMuted,
    font: FONT,
    labelFont: FONT,
    label,
    labelSize: label ? 14 : 0,
    size,
    grid: { stroke: tokens.line, width: 1 },
    ticks: { stroke: tokens.line, width: 1, size: 4 },
    ...(values && { values }),
  };
}

/** Time axis with IST labels: dates when ticks are a day or more apart, else hh:mm. */
export const timeAxis = (tokens) => ({
  ...axis(tokens, { size: 28 }),
  space: 64,
  values: (_u, splits, _axis, _space, incr) =>
    splits.map((v) => (incr >= 86400 ? formatDay(v * 1000) : formatTime(v * 1000))),
});

/** A line series in a token colour. */
export const line = (stroke, { label, width = 1.5, dash, points = false, scale } = {}) => ({
  label,
  stroke,
  width,
  ...(dash && { dash }),
  ...(scale && { scale }),
  points: { show: points },
  spanGaps: false,
});

export const cursorSync = (key) => ({
  sync: { key, setSeries: false },
  points: { size: 6 },
  drag: { x: false, y: false },
});
