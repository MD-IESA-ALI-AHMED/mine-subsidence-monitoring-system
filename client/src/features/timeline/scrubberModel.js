/**
 * Marks for the time scrubber, positioned 0..1 along [start, end].
 * Returns { blasts: [{ id, x }], alerts: [{ id, x, tier, title }], degraded: [{ x0, x1, reason }] }.
 */
export function scrubberMarks({ start, end, events = [], alerts = [], meshStates = [] }) {
  const span = end - start || 1;
  const pos = (t) => (new Date(t).getTime() - start) / span;
  const inside = (x) => x >= 0 && x <= 1;

  const blasts = events
    .filter((e) => e.kind === 'blast')
    .map((e) => ({ id: e._id, x: pos(e.ts) }))
    .filter((m) => inside(m.x));

  const alertMarks = alerts
    .filter((a) => a.kind !== 'inspect_node')
    .map((a) => ({ id: a._id, x: pos(a.createdAt), tier: a.tier, title: a.title }))
    .filter((m) => inside(m.x));

  const states = [...meshStates].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const degraded = [];
  states.forEach((st, i) => {
    if (!st.degraded) return;
    const next = states[i + 1];
    const x0 = Math.max(0, pos(st.ts));
    const x1 = Math.min(1, next ? pos(next.ts) : 1);
    if (x1 > x0) degraded.push({ x0, x1, reason: st.reason });
  });
  return { blasts, alerts: alertMarks, degraded };
}

/** Time for a pointer position along the track, snapped to 10 minutes and clamped. */
export function timeAtFraction(f, start, end, stepMin = 10) {
  const t = start + Math.max(0, Math.min(1, f)) * (end - start);
  const step = stepMin * 60_000;
  return Math.min(end, Math.max(start, Math.round(t / step) * step));
}
