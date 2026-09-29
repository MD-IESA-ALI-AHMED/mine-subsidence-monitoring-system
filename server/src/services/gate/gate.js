import { dist } from '../field/geometry.js';

/**
 * Corroborated gate with hysteresis. Pure.
 *
 * nodes:   [{ id, x, y, status, change24h_mm, speed_mmPerDay, sinking_mm }] — ground sensors only;
 *          reference units and excluded nodes (recent truck transient, seating re-baseline) must
 *          already be filtered out by the caller.
 * prev:    { open, openedAt, belowSince } from the last run (or undefined)
 * Returns  { open, openedAt, belowSince, reason, triggered: [ids], zmax_mm, zmaxNodeId, changed }.
 *
 * Opens when, in some neighbourhood (nodes within neighbourRadius_m of a node, itself included),
 * at least minCorroborating nodes have |24 h change| >= gateOn_mm or speed >= gateOnSpeed, or when
 * any node is silent_after_rise. Closes only after every neighbourhood has stayed below the lower
 * gateOff values for holdMinutes.
 */
export function evaluateGate(nodes, thresholds, prev = {}, now = new Date()) {
  const t = thresholds;
  const on = (n) =>
    Math.abs(n.change24h_mm ?? 0) >= t.gateOn_mm ||
    (n.speed_mmPerDay ?? 0) >= t.gateOnSpeed_mmPerDay;
  const aboveOff = (n) =>
    Math.abs(n.change24h_mm ?? 0) >= t.gateOff_mm ||
    (n.speed_mmPerDay ?? 0) >= t.gateOffSpeed_mmPerDay;

  const corroborated = (test) => {
    const hits = new Set();
    for (const centre of nodes) {
      const hood = nodes.filter(
        (n) => dist(n.x, n.y, centre.x, centre.y) <= t.neighbourRadius_m && test(n),
      );
      if (hood.length >= t.minCorroborating) hood.forEach((n) => hits.add(n.id));
    }
    return [...hits];
  };

  let zmax = null;
  for (const n of nodes) {
    if (
      n.change24h_mm != null &&
      (!zmax || Math.abs(n.change24h_mm) > Math.abs(zmax.change24h_mm))
    ) {
      zmax = n;
    }
  }

  const silent = nodes.filter((n) => n.status === 'silent_after_rise').map((n) => n.id);
  const onHits = corroborated(on);
  const offHits = corroborated(aboveOff);
  const base = {
    zmax_mm: zmax ? +zmax.change24h_mm.toFixed(2) : null,
    zmaxNodeId: zmax?.id ?? null,
  };

  if (onHits.length || silent.length) {
    const reason = silent.length
      ? `${silent.join(', ')} silent after rising`
      : `${onHits.length} nodes moving together`;
    return {
      ...base,
      open: true,
      openedAt: prev.open ? prev.openedAt : now,
      belowSince: null,
      reason,
      triggered: [...new Set([...onHits, ...silent])],
      changed: !prev.open,
    };
  }

  if (!prev.open) {
    return {
      ...base,
      open: false,
      openedAt: null,
      belowSince: null,
      reason: null,
      triggered: [],
      changed: false,
    };
  }

  // Open, and no neighbourhood is above the ON level: hold until all fall below OFF for holdMinutes.
  if (offHits.length) {
    return {
      ...base,
      open: true,
      openedAt: prev.openedAt,
      belowSince: null,
      reason: 'Holding: movement above the closing level',
      triggered: offHits,
      changed: false,
    };
  }
  const belowSince = prev.belowSince ? new Date(prev.belowSince) : now;
  const heldMin = (now - belowSince) / 60000;
  if (heldMin >= t.holdMinutes) {
    return {
      ...base,
      open: false,
      openedAt: null,
      belowSince: null,
      reason: 'Quiet',
      triggered: [],
      changed: true,
    };
  }
  return {
    ...base,
    open: true,
    openedAt: prev.openedAt,
    belowSince,
    reason: `Closing after ${Math.round(t.holdMinutes - heldMin)} min of quiet`,
    triggered: [],
    changed: false,
  };
}
