import { dist, groundZ } from '../field/geometry.js';
import { buildMeshTree, linkQuality, nearestRelays, rssiAt } from '../topology/meshTree.js';
import { makeRng, uniform } from './rng.js';

const pad = (n, w) => String(n).padStart(w, '0');

function clusterPoints(c) {
  if (c.points) return c.points;
  const pts = [];
  const [cx, cy] = c.centre;
  for (let j = 0; j < c.rows; j += 1) {
    for (let i = 0; i < c.cols; i += 1) {
      pts.push([
        cx + (i - (c.cols - 1) / 2) * c.spacing_m,
        cy + (j - (c.rows - 1) / 2) * c.spacing_m,
      ]);
    }
  }
  return pts;
}

/** Sensor positions: a coarse base grid, tightened over OW1 and the south-east corner of P1. */
function sensorPositions(layout) {
  const dense = layout.denseClusters.flatMap(clusterPoints);
  const base = [];
  for (const y of layout.baseGrid.ys) {
    for (const x of layout.baseGrid.xs) {
      if (!dense.some(([dx, dy]) => dist(x, y, dx, dy) < 10)) base.push([x, y]);
    }
  }
  return [...base, ...dense];
}

/** Builds the 60 node documents (without live state) from scenarios.json. */
export function buildNodes(cfg) {
  const { layout, site } = cfg;
  const rng = makeRng(cfg.seed, 'layout');
  const relays = layout.relays;
  const rootId = relays[0].id;
  const tree = buildMeshTree(relays, rootId, layout.meshRange_m);

  const sensors = sensorPositions(layout)
    .map(([x, y]) => [
      +(x + uniform(rng, [-1, 1]) * layout.jitter_m).toFixed(1),
      +(y + uniform(rng, [-1, 1]) * layout.jitter_m).toFixed(1),
    ])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  if (sensors.length !== 48) throw new Error(`Layout gives ${sensors.length} sensors, expected 48`);

  const rodIdx = new Set(
    layout.rodSensors.map(([rx, ry]) => {
      let best = 0;
      sensors.forEach(([x, y], i) => {
        if (dist(x, y, rx, ry) < dist(sensors[best][0], sensors[best][1], rx, ry)) best = i;
      });
      return best;
    }),
  );

  const common = (id, x, y) => ({
    _id: id,
    siteId: site.id,
    x,
    y,
    z_ground: +groundZ(site.ground, x, y).toFixed(2),
    installedOffset_min: -3 * 1440,
    azimuth_deg: Math.round(uniform(rng, [0, 360])),
  });
  const attach = (x, y) => {
    const [p, b] = nearestRelays(x, y, relays);
    return { parentRelayId: p.id, backupRelayId: b.id };
  };

  const sensorDocs = sensors.map(([x, y], i) => ({
    ...common(`N-${pad(i + 1, 3)}`, x, y),
    type: rodIdx.has(i) ? 'sensor_rod' : 'sensor',
    label: `N-${pad(i + 1, 3)}`,
    hasRod: rodIdx.has(i),
    hasRtk: false,
    firmware: 'sensor-1.4.2',
    ...attach(x, y),
  }));

  const relayDocs = relays.map((r) => ({
    ...common(r.id, r.x, r.y),
    type: r.id === rootId ? 'root' : 'relay',
    label: r.id,
    hasRod: false,
    hasRtk: false,
    firmware: 'relay-2.1.0',
    meshParentId: tree.get(r.id).parentId,
    meshLayer: tree.get(r.id).layer,
  }));

  const refDocs = layout.references.map((r) => ({
    ...common(r.id, r.x, r.y),
    type: r.rtk ? 'reference_rtk' : 'reference',
    label: r.id,
    hasRod: false,
    hasRtk: r.rtk,
    firmware: 'sensor-1.4.2',
    ...attach(r.x, r.y),
  }));

  return [...sensorDocs, ...relayDocs, ...refDocs];
}

/** ESP-NOW (sensor -> relay) and mesh (relay -> parent) links for a given topology. */
export function buildLinks(cfg, nodes, { rootId, down = new Set() } = {}) {
  const relays = cfg.layout.relays;
  const tree = buildMeshTree(relays, rootId ?? relays[0].id, cfg.layout.meshRange_m, down);
  const byId = new Map(nodes.map((n) => [n._id, n]));
  const links = [];
  const add = (from, to, kind) => {
    const a = byId.get(from);
    const b = byId.get(to);
    const q = linkQuality(rssiAt(dist(a.x, a.y, b.x, b.y), cfg.signals.rssi));
    links.push({
      _id: `${kind}:${from}:${to}`,
      siteId: cfg.site.id,
      from,
      to,
      kind,
      quality_0to1: +q.toFixed(2),
    });
  };
  for (const n of nodes) {
    if (n.parentRelayId) {
      const primary = down.has(n.parentRelayId) ? n.backupRelayId : n.parentRelayId;
      add(n._id, primary, 'espnow_primary');
      if (!down.has(n.backupRelayId) && primary !== n.backupRelayId) {
        add(n._id, n.backupRelayId, 'espnow_backup');
      }
    }
  }
  for (const [id, { parentId }] of tree) if (parentId) add(id, parentId, 'mesh');
  return { links, tree };
}
