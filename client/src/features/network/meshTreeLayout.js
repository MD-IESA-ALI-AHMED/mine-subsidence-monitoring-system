/**
 * Layout for the mesh tree diagram: relays in rows by hop count from the root (layer 1 at the top),
 * ordered west to east within a row; the number of units reporting to each relay.
 * nodes: node DTOs; links: current links. Returns { rows, relays: [{ id, x, y, layer, count }], edges }.
 */
export function meshTreeLayout(nodes, links, { width = 300, rowH = 56, pad = 28 } = {}) {
  const relays = nodes.filter((n) => n.type === 'relay' || n.type === 'root');
  const meshParent = new Map(links.filter((l) => l.kind === 'mesh').map((l) => [l.from, l.to]));
  const primary = links.filter((l) => l.kind === 'espnow_primary');
  const count = new Map();
  for (const l of primary) count.set(l.to, (count.get(l.to) ?? 0) + 1);

  // Hop count from the current links (the root may have changed since the node documents were written).
  const layerOf = (id) => {
    let hops = 1;
    let cur = id;
    const seen = new Set();
    while (meshParent.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = meshParent.get(cur);
      hops += 1;
    }
    return hops;
  };
  const inTree = relays.filter(
    (r) => meshParent.has(r.id) || links.some((l) => l.kind === 'mesh' && l.to === r.id),
  );
  const byLayer = new Map();
  for (const r of inTree) {
    const layer = layerOf(r.id);
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer).push(r);
  }
  const placed = [];
  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  layers.forEach((layer, row) => {
    const list = byLayer.get(layer).sort((a, b) => a.x - b.x);
    list.forEach((r, i) => {
      placed.push({
        id: r.id,
        layer,
        count: count.get(r.id) ?? 0,
        down: r.status !== 'online',
        x: pad + ((i + 0.5) / list.length) * (width - 2 * pad),
        y: pad + row * rowH,
      });
    });
  });
  const at = new Map(placed.map((p) => [p.id, p]));
  const edges = [...meshParent.entries()]
    .filter(([from, to]) => at.has(from) && at.has(to))
    .map(([from, to]) => ({ from: at.get(from), to: at.get(to) }));
  const detached = relays.filter((r) => !at.has(r.id)).map((r) => r.id);
  return {
    rows: layers.length,
    height: pad * 2 + (layers.length - 1) * rowH,
    relays: placed,
    edges,
    detached,
  };
}
