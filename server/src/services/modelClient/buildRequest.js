import { randomUUID } from 'node:crypto';
import { IST_OFFSET_MIN } from '@subsidence/shared';
import { expectedAt } from '../field/expected.js';
import { dist, distToPolygonEdge, distToPolyline, pointInPolygon } from '../field/geometry.js';

export const HORIZONS_H = [1, 6, 24, 72];
const STEP_MIN = 10;
const LENGTH = 144;
const NEAR_ROAD_M = 15;

/** 2026-10-02T14:20:00+05:30 */
export function toIstIso(date) {
  const local = new Date(date.getTime() + IST_OFFSET_MIN * 60000);
  return `${local.toISOString().slice(0, 19)}+05:30`;
}

function staticFor(site, node, expected_mm) {
  let panel = null;
  for (const p of site.panels) {
    const inside = pointInPolygon(node.x, node.y, p.polygon);
    const d = distToPolygonEdge(node.x, node.y, p.polygon);
    if (!panel || inside || d < panel.d) panel = { p, d, inside };
    if (inside) break;
  }
  const road = site.haulRoads?.[0]?.polyline;
  return {
    distToPanelEdge_m: panel ? +panel.d.toFixed(1) : null,
    depth_m: panel?.p.depth_m ?? null,
    extractionStatus: panel?.p.extractionStatus ?? null,
    knotheExpected_mm: expected_mm == null ? null : +expected_mm.toFixed(2),
    nearHaulRoad: road ? distToPolyline(node.x, node.y, road) <= NEAR_ROAD_M : false,
  };
}

/** 144 ten-minute slots ending at `now`; each slot takes the latest reading inside it. */
function seriesFor(rows, now, eventTimes, expectedFn) {
  const end = Math.floor(now.getTime() / (STEP_MIN * 60000)) * STEP_MIN * 60000;
  const slots = Array.from({ length: LENGTH }, (_, i) => end - (LENGTH - 1 - i) * STEP_MIN * 60000);
  const bySlot = new Map();
  for (const r of rows) {
    const s = Math.ceil(r.ts.getTime() / (STEP_MIN * 60000)) * STEP_MIN * 60000;
    bySlot.set(s, r);
  }
  const fields = [
    'sinking_mm',
    'speed_mmPerDay',
    'accel_mmPerDay2',
    'tiltX_urad',
    'tiltY_urad',
    'rod_mm',
    'temp_C',
  ];
  const out = {
    t: slots.map((s) => toIstIso(new Date(s))),
    expected_mm: slots.map((s) => +expectedFn(new Date(s)).toFixed(3)),
    event: [],
    mask: [],
  };
  for (const f of fields) out[f] = [];
  for (const s of slots) {
    const r = bySlot.get(s);
    for (const f of fields) out[f].push(r?.[f] ?? null);
    out.mask.push(r && r.sinking_mm != null ? 0 : 1);
    out.event.push(
      r?.flags?.eventInWindow || eventTimes.some((t) => t > s - STEP_MIN * 60000 && t <= s) ? 1 : 0,
    );
  }
  return out;
}

/**
 * The POST /predict body for zone nodes plus their neighbours (never all nodes unless needed).
 * Missing values are null and marked 1 in mask; nothing is interpolated.
 */
export function buildModelRequest({
  site,
  nodes,
  metrics,
  zones,
  readingsByNode,
  now,
  events = [],
}) {
  const th = site.thresholds;
  const byId = new Map(nodes.map((n) => [n._id, n]));
  const zoneIds = new Set(zones.flatMap((z) => z.nodeIds));
  const include = new Set(zoneIds);
  for (const id of zoneIds) {
    const a = byId.get(id);
    for (const n of nodes) {
      if (metrics.get(n._id)?.measuring && dist(a.x, a.y, n.x, n.y) <= th.neighbourRadius_m)
        include.add(n._id);
    }
  }
  const eventTimes = events.map((e) => new Date(e.ts).getTime());
  return {
    requestId: randomUUID(),
    siteId: site._id,
    generatedAt: toIstIso(now),
    horizonsHours: HORIZONS_H,
    window: { stepMinutes: STEP_MIN, length: LENGTH },
    limits: {
      sinking_mm: th.limitSinking_mm,
      speed_mmPerDay: th.limitSpeed_mmPerDay,
      tilt_mmPerM: th.limitTilt_mmPerM,
    },
    nodes: [...include].sort().map((id) => {
      const n = byId.get(id);
      return {
        nodeId: id,
        type: n.type,
        x: n.x,
        y: n.y,
        static: staticFor(site, n, metrics.get(id)?.expected_mm),
        series: seriesFor(readingsByNode.get(id) ?? [], now, eventTimes, (t) =>
          expectedAt(site, n.x, n.y, t),
        ),
      };
    }),
    zones: zones.map((z) => ({ zoneKey: z.zoneKey, nodeIds: z.nodeIds })),
  };
}
