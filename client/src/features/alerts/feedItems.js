const EVENT_TEXT = {
  blast: (e) => `Blast, PPV ${e.ppv_mmps?.toFixed(1) ?? '—'} mm/s`,
  seating_shift: (e) => `Seating shift at ${e.nodeIds?.[0] ?? 'a node'}, re-baselined`,
  impact: (e) => `Impact at ${e.nodeIds?.join(', ')}`,
  tamper: (e) => `Possible tamper at ${e.nodeIds?.join(', ')}`,
};

/**
 * Alerts and notable events merged into one list, newest first. Truck transients are left out:
 * they are routine and never change a decision.
 */
export function feedItems(alerts = [], events = [], limit = 20) {
  const a = alerts.map((x) => ({
    id: `a-${x._id}`,
    kind: 'alert',
    ts: x.createdAt,
    tier: x.tier,
    text: x.kind === 'inspect_node' ? x.title : `${x.zoneKey} ${x.tier}`,
    zoneKey: x.kind === 'zone' ? x.zoneKey : null,
    nodeId: x.kind === 'inspect_node' ? x.nodeIds?.[0] : null,
    state: x.state,
  }));
  const e = events
    .filter((x) => EVENT_TEXT[x.kind])
    .map((x) => ({
      id: `e-${x._id}`,
      kind: 'event',
      ts: x.ts,
      text: EVENT_TEXT[x.kind](x),
      eventKind: x.kind,
    }));
  return [...a, ...e].sort((p, q) => new Date(q.ts) - new Date(p.ts)).slice(0, limit);
}
