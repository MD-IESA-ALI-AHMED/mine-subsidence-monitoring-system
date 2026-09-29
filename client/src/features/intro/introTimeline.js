// Opening animation timeline (seconds). The real scene assembles itself; nothing here renders.

export const INTRO_S = 3.2;
export const REDUCED_S = 0.25;
export const HOLD_AT_S = 1.4; // if data is not ready by now, hold at the contour stage

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));

/** Stage values when no intro is playing: everything fully shown. */
export const FINISHED = Object.freeze({
  overlay: 0,
  contours: 1,
  terrain: 1,
  nodes: 1,
  nodesElapsed: Infinity,
  links: 1,
  camera: 1,
  ui: 1,
  zones: 1,
  done: true,
});

/**
 * Progress 0..1 of each stage at time t.
 *   0.0–0.3  empty background, site name and loading line (overlay)
 *   0.3–1.2  contours draw outward from the mined area
 *   1.0–1.6  terrain and underground panels fade in
 *   1.4–2.2  nodes light up in mesh order (nodesElapsed drives the per-node stagger)
 *   1.9–2.6  links draw from the root outward
 *   2.4–2.9  camera eases from the high top view to the default view
 *   2.6–3.2  top bar, rails and scrubber slide in; zones and labels appear last
 * Under reduced motion everything fades in together over 250 ms.
 */
export function stagesAt(t, { reduced = false } = {}) {
  if (reduced) {
    const f = seg(t, 0, REDUCED_S);
    return {
      overlay: 0,
      contours: f,
      terrain: f,
      nodes: f,
      nodesElapsed: t >= REDUCED_S ? Infinity : 0,
      links: f,
      camera: 1,
      ui: f,
      zones: f,
      done: t >= REDUCED_S,
    };
  }
  return {
    overlay: 1 - seg(t, 1.0, 1.4),
    contours: seg(t, 0.3, 1.2),
    terrain: seg(t, 1.0, 1.6),
    nodes: seg(t, 1.4, 2.2),
    nodesElapsed: Math.max(0, t - 1.4),
    links: seg(t, 1.9, 2.6),
    camera: seg(t, 2.4, 2.9),
    ui: seg(t, 2.6, INTRO_S),
    zones: seg(t, 2.6, INTRO_S),
    done: t >= INTRO_S,
  };
}

/** Next time value: advances by dt but holds at the contour stage until the data is ready. */
export function advance(t, dt, dataReady) {
  const next = t + dt;
  return !dataReady && next > HOLD_AT_S ? Math.max(t, Math.min(next, HOLD_AT_S)) : next;
}

/**
 * Mesh order for nodes lighting up: root, relays by mesh layer, then each relay's units in the
 * order of their relays, then reference units. Returns Map(id -> rank).
 */
export function meshOrder(nodes) {
  const relays = nodes
    .filter((n) => n.type === 'root' || n.type === 'relay')
    .sort((a, b) => (a.meshLayer ?? 9) - (b.meshLayer ?? 9) || a.x - b.x);
  const relayRank = new Map(relays.map((r, i) => [r.id, i]));
  const others = nodes
    .filter((n) => !relayRank.has(n.id))
    .sort((a, b) => {
      const ra = relayRank.get(a.parentRelayId) ?? 99;
      const rb = relayRank.get(b.parentRelayId) ?? 99;
      const refA = a.type.startsWith('reference') ? 1 : 0;
      const refB = b.type.startsWith('reference') ? 1 : 0;
      return refA - refB || ra - rb || a.id.localeCompare(b.id);
    });
  return new Map([...relays, ...others].map((n, i) => [n.id, i]));
}

/** Per-node 0..1 for the node stage: 20 ms apart (tighter if needed to finish within 0.8 s). */
export function nodeAppear(rank, count, nodesElapsed) {
  if (nodesElapsed === Infinity) return 1;
  const spacing = Math.min(0.02, 0.55 / Math.max(1, count));
  return clamp01((nodesElapsed - rank * spacing) / 0.25);
}
