import { SOCKET_EVENTS } from '@subsidence/shared';
import { raiseZoneAlert } from '../../modules/alerts/service.js';
import { meshStateAt } from '../../modules/links/service.js';
import { Node } from '../../modules/nodes/model.js';
import { updateStatus } from '../../modules/system/service.js';
import { Zone } from '../../modules/zones/model.js';
import { bus, publish } from '../../realtime/bus.js';
import { dist } from '../field/geometry.js';
import { risenTiers } from './assess.js';

/** Persists node status changes (online / offline / silent_after_rise) and announces them. */
export async function saveNodeStatuses(siteId, inputs) {
  const changes = [];
  for (const n of inputs.nodes) {
    const status = inputs.metrics.get(n._id).status;
    if (status !== n.status) changes.push({ nodeId: n._id, status, lastSeenAt: n.lastSeenAt });
  }
  if (!changes.length) return changes;
  await Node.bulkWrite(
    changes.map((c) => ({
      updateOne: { filter: { _id: c.nodeId }, update: { $set: { status: c.status } } },
    })),
  );
  publish(SOCKET_EVENTS.NODE_STATUS, siteId, changes);
  return changes;
}

/** Nodes in, or within fastModeRadius_m of, an active zone report every minute. */
export async function saveFastMode(siteId, inputs, zones) {
  const radius = inputs.site.thresholds.fastModeRadius_m;
  const zoneNodes = zones.flatMap((z) => z.nodeIds).map((id) => inputs.metrics.get(id));
  const wanted = new Set(
    inputs.nodes
      .filter((n) => n.type === 'sensor' || n.type === 'sensor_rod')
      .filter((n) => zoneNodes.some((z) => dist(n.x, n.y, z.x, z.y) <= radius))
      .map((n) => n._id),
  );
  const changes = inputs.nodes
    .filter((n) => Boolean(n.fastMode) !== wanted.has(n._id))
    .map((n) => ({
      nodeId: n._id,
      fastMode: wanted.has(n._id),
      status: inputs.metrics.get(n._id).status,
    }));
  if (changes.length) {
    await Node.bulkWrite(
      changes.map((c) => ({
        updateOne: { filter: { _id: c.nodeId }, update: { $set: { fastMode: c.fastMode } } },
      })),
    );
    publish(SOCKET_EVENTS.NODE_STATUS, siteId, changes);
  }
  bus.emit('fastmode:changed', { siteId, nodeIds: [...wanted] });
  return wanted;
}

const ZONE_FIELDS = [
  'zoneKey',
  'nodeIds',
  'hull',
  'area_m2',
  'centroid',
  'peakSinking_mm',
  'peakExcess_mm',
  'worstNodeId',
  'meanSpeed_mmPerDay',
  'meanExcessSpeed_mmPerDay',
  'maxSpeed_mmPerDay',
  'maxExcessSpeed_mmPerDay',
  'accelerating',
  'knotheExpected_mm',
  'deviation_mm',
  'nearVillage',
  'hasSilentAfterRise',
  'severity',
  'tCrit',
  'inverseVelocity',
];

export async function saveZones(siteId, runId, zones, now) {
  const docs = zones.map((z) => ({
    siteId,
    runId,
    createdAt: now,
    active: true,
    ...Object.fromEntries(ZONE_FIELDS.map((k) => [k, z[k]])),
  }));
  if (docs.length) await Zone.insertMany(docs);
  else await Zone.create({ siteId, runId, createdAt: now, zoneKey: 'Z-NONE', active: false });
  return docs;
}

/** Raises alerts for zones whose tier rose, and "inspect node" alerts for lone outliers. */
export async function saveAlerts(siteId, inputs, assessed, now) {
  const raised = [];
  for (const a of risenTiers(assessed, inputs.prevZones)) {
    const alert = await raiseZoneAlert({ siteId, ...a, at: now });
    if (alert) raised.push(alert);
  }
  const inZone = new Set(assessed.flatMap((z) => z.nodeIds));
  const limit = inputs.site.thresholds.limitSinking_mm;
  for (const m of inputs.metrics.values()) {
    if (!m.measuring || inZone.has(m.id) || !(m.excess_mm > limit)) continue;
    const alert = await raiseZoneAlert({
      siteId,
      kind: 'inspect_node',
      zoneKey: `node:${m.id}`,
      nodeIds: [m.id],
      tier: 'watch',
      title: `Inspect ${m.id}`,
      reason: `${m.id} alone shows ${m.excess_mm.toFixed(0)} mm more sinking than expected; no neighbour agrees. Check the unit.`,
      at: now,
    });
    if (alert) raised.push(alert);
  }
  return raised;
}

export async function saveSystemStatus(siteId, { inputs, gate, predict, now, live }) {
  const mesh = await meshStateAt(siteId, now);
  const statuses = [...inputs.metrics.values()].map((m) => m.status);
  const lastTs = Math.max(
    0,
    ...[...inputs.metrics.values()].map((m) => m.lastTs?.getTime?.() ?? 0),
  );
  const set = {
    meshOnline: statuses.filter((s) => s === 'online').length,
    meshTotal: statuses.length,
    rootId: mesh.rootId,
    degraded: Boolean(mesh.degraded),
    degradedReason: mesh.degraded ? mesh.reason : null,
    degradedSince: mesh.degraded ? mesh.ts : null,
    lastReadingAt: lastTs ? new Date(lastTs) : null,
    ...(live && { siteClock: now }),
    gate: {
      open: gate.open,
      openedAt: gate.openedAt,
      belowSince: gate.belowSince,
      reason: gate.reason,
      zmax_mm: gate.zmax_mm,
      zmaxNodeId: gate.zmaxNodeId,
    },
  };
  if (live && predict.fresh) {
    Object.assign(set, {
      'model.reachable': true,
      'model.lastRunAt': now,
      'model.lastGoodAt': now,
      'model.lastLatency_ms': predict.latency_ms,
      'model.lastError': null,
      'model.modelVersion': predict.prediction.modelVersion,
    });
  } else if (live && predict.error) {
    Object.assign(set, {
      'model.reachable': false,
      'model.lastRunAt': now,
      'model.lastError': predict.error,
    });
  }
  return updateStatus(siteId, set);
}
