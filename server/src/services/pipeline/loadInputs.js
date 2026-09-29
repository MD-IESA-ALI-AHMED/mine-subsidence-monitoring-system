import { Event } from '../../modules/events/model.js';
import { Node } from '../../modules/nodes/model.js';
import { recentByNode } from '../../modules/readings/service.js';
import { Site } from '../../modules/sites/model.js';
import { SystemStatus } from '../../modules/system/model.js';
import { zonesAt } from '../../modules/zones/service.js';
import { nodeMetrics } from './nodeMetrics.js';

const HOUR_MS = 3_600_000;
const WINDOW_H = 36;
const TRANSIENT_EXCLUDE_MIN = 30;

/** Nodes left out of the gate: re-baselined after a seating shift in the last 24 h, or shaken by a truck just now. */
export function exclusions(nodes, events, now) {
  const out = new Set();
  for (const n of nodes) {
    if (n.rebaselinedAt && now - new Date(n.rebaselinedAt) < 24 * HOUR_MS) out.add(n._id);
  }
  for (const e of events) {
    if (e.kind === 'vehicle_transient' && now - new Date(e.ts) < TRANSIENT_EXCLUDE_MIN * 60000) {
      e.nodeIds.forEach((id) => out.add(id));
    }
  }
  return out;
}

/** Everything one pipeline run needs, as of site time `now`. */
export async function loadInputs(siteId, now) {
  const since = new Date(now.getTime() - WINDOW_H * HOUR_MS);
  const [site, nodes, status, prevZones, events] = await Promise.all([
    Site.findById(siteId).lean(),
    Node.find({ siteId }).lean(),
    SystemStatus.findById(siteId).lean(),
    zonesAt(siteId, now),
    Event.find({ siteId, ts: { $gte: new Date(now - 24 * HOUR_MS), $lte: now } }).lean(),
  ]);
  if (!site) throw new Error(`Site ${siteId} not found`);
  const readingsByNode = await recentByNode(
    siteId,
    nodes.map((n) => n._id),
    since,
    now,
  );
  // In a replay (backfill) the node documents hold end-of-history values; use the readings instead.
  for (const n of nodes) {
    const rows = readingsByNode.get(n._id);
    if (rows.length) n.lastSeenAt = rows.at(-1).ts;
    else if (n.lastSeenAt && new Date(n.lastSeenAt) > now) n.lastSeenAt = null;
  }
  const excluded = exclusions(nodes, events, now);
  const metrics = new Map(
    nodes.map((node) => [
      node._id,
      nodeMetrics({
        site,
        node,
        rows: readingsByNode.get(node._id),
        now,
        excluded: excluded.has(node._id),
      }),
    ]),
  );
  return { site, nodes, status, prevZones, events, readingsByNode, metrics };
}
