import { SITE_TIMEZONE } from '@subsidence/shared';

// All times are shown in IST. Relative times are measured against the site clock, which runs
// faster than the wall clock while the simulator drives the site.

const fmtCache = new Map();
function formatter(opts) {
  const key = JSON.stringify(opts);
  if (!fmtCache.has(key)) {
    fmtCache.set(key, new Intl.DateTimeFormat('en-GB', { timeZone: SITE_TIMEZONE, ...opts }));
  }
  return fmtCache.get(key);
}

const toDate = (v) => (v instanceof Date ? v : new Date(v));

/** 14:20 (or 2:20 pm with hour12). */
export function formatTime(v, { seconds = false, hour12 = false } = {}) {
  if (v == null) return '—';
  return formatter({
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds && { second: '2-digit' }),
    hour12,
  }).format(toDate(v));
}

/** "13:30" for today (site time), "Sat 13:30" for earlier days. */
export function formatFeedTime(v, now, opts = {}) {
  if (v == null) return '—';
  const day = (d) =>
    formatter({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(toDate(d));
  const time = formatTime(v, opts);
  return day(v) === day(now)
    ? time
    : `${formatter({ weekday: 'short' }).format(toDate(v))} ${time}`;
}

/** 3 Oct 11:40 */
export function formatDateTime(v, opts = {}) {
  if (v == null) return '—';
  const d = toDate(v);
  return `${formatter({ day: 'numeric', month: 'short' }).format(d)} ${formatTime(d, opts)}`;
}

/** 3 Oct 2026, 11:40:05 IST — for tooltips on relative times. */
export function formatFull(v) {
  if (v == null) return '';
  const d = toDate(v);
  const date = formatter({ day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  return `${date}, ${formatTime(d, { seconds: true })} IST`;
}

/** "4 min ago", "2 h ago", "3 d ago" relative to `now` (site time). */
export function formatRelative(v, now) {
  if (v == null) return '—';
  const s = Math.round((toDate(now) - toDate(v)) / 1000);
  if (s < 0) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** "26 h", "3.5 h", "2 d 4 h" for a time to limit. */
export function formatHours(h) {
  if (h == null) return '—';
  if (h < 10) return `${h.toFixed(1)} h`;
  if (h < 72) return `${Math.round(h)} h`;
  return `${Math.floor(h / 24)} d ${Math.round(h % 24)} h`;
}

/** "limit in 26 h", "limit reached", or null when no limit is in sight. */
export function limitText(h) {
  if (h == null) return null;
  return h <= 0.05 ? 'limit reached' : `limit in ${formatHours(h)}`;
}

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
