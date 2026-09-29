import { batteryPct, isRelayType } from '@subsidence/shared';
import { notFound } from '../../middleware/error.js';
import { meshPath } from '../../services/topology/meshTree.js';
import { getSiteNow } from '../../services/time/siteClock.js';
import { meshStateAt } from '../links/service.js';
import { latestAt, latestReading } from '../readings/service.js';
import { zonesAt } from '../zones/service.js';
import { Node } from './model.js';

const ONLINE_WINDOW_MIN = 30;

function zoneIndex(zones) {
  const idx = new Map();
  for (const z of zones) {
    for (const id of z.nodeIds) idx.set(id, { zoneKey: z.zoneKey, tier: z.severity?.tier ?? null });
  }
  return idx;
}

function toDto(n, zone, override = {}) {
  return {
    id: n._id,
    type: n.type,
    label: n.label,
    x: n.x,
    y: n.y,
    z: n.z_ground,
    status: n.status,
    lastSeenAt: n.lastSeenAt,
    battery: n.battery,
    rssi_dBm: n.rssi_dBm,
    fastMode: n.fastMode,
    hasRod: n.hasRod,
    hasRtk: n.hasRtk,
    parentRelayId: n.parentRelayId,
    backupRelayId: n.backupRelayId,
    meshParentId: n.meshParentId,
    meshLayer: n.meshLayer,
    latest: n.latest ?? {},
    zoneKey: zone?.zoneKey ?? null,
    tier: zone?.tier ?? null,
    ...override,
  };
}

/** Values a node had at a past time, from its last reading at or before `at`. */
function pastOverride(n, r, at) {
  if (!r) {
    const silent = n.status === 'silent_after_rise' && n.lastSeenAt && at > n.lastSeenAt;
    return { status: silent ? 'silent_after_rise' : 'offline', latest: {} };
  }
  const ageMin = (at - r.ts) / 60000;
  return {
    status: ageMin <= ONLINE_WINDOW_MIN ? 'online' : n.status === 'online' ? 'offline' : n.status,
    lastSeenAt: r.ts,
    battery: { mV: r.battery_mV, pct: batteryPct(r.battery_mV) },
    rssi_dBm: r.rssi_dBm,
    fastMode: Boolean(r.flags?.fastMode),
    latest: {
      sinking_mm: r.sinking_mm,
      speed_mmPerDay: r.speed_mmPerDay,
      accel_mmPerDay2: r.accel_mmPerDay2,
      tiltX_urad: r.tiltX_urad,
      tiltY_urad: r.tiltY_urad,
      temp_C: r.temp_C,
      rod_mm: r.rod_mm,
    },
  };
}

/** All nodes with latest values, now or at a past time (for the time scrubber). */
export async function listNodes(siteId, at) {
  const nodes = await Node.find({ siteId }).sort({ _id: 1 }).lean();
  const zones = zoneIndex(await zonesAt(siteId, at));
  if (!at) return nodes.map((n) => toDto(n, zones.get(n._id)));
  const readings = await latestAt(siteId, at, 24 * 60);
  return nodes.map((n) => toDto(n, zones.get(n._id), pastOverride(n, readings.get(n._id), at)));
}

export async function getNode(id) {
  const n = await Node.findById(id).lean();
  if (!n) throw notFound(`Node ${id} not found`);
  const now = await getSiteNow(n.siteId);
  const [zones, mesh, last] = await Promise.all([
    zonesAt(n.siteId),
    meshStateAt(n.siteId),
    latestReading(n._id, now),
  ]);
  const readings = new Map(last ? [[n._id, last]] : []);
  const parentOf = (rid) => mesh.links.find((l) => l.kind === 'mesh' && l.from === rid)?.to ?? null;
  const down = new Set(mesh.down ?? []);
  const primary = isRelayType(n.type)
    ? n._id
    : down.has(n.parentRelayId)
      ? n.backupRelayId
      : n.parentRelayId;
  const path = isRelayType(n.type)
    ? meshPath(n._id, parentOf(n._id), parentOf)
    : meshPath(n._id, primary, parentOf);
  const { _id: _ignored, meta: _meta, ...reading } = readings.get(n._id) ?? {};
  return {
    ...toDto(n, zoneIndex(zones).get(n._id)),
    installedAt: n.installedAt,
    firmware: n.firmware,
    azimuth_deg: n.azimuth_deg,
    rebaselinedAt: n.rebaselinedAt,
    meshPath: path,
    reading: readings.has(n._id) ? reading : null,
  };
}
