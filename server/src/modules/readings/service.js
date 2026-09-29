import { Reading } from './model.js';

export const SERIES_FIELDS = [
  'sinking_mm',
  'speed_mmPerDay',
  'accel_mmPerDay2',
  'tiltX_urad',
  'tiltY_urad',
  'rod_mm',
  'temp_C',
  'pressure_Pa',
  'battery_mV',
  'solar_mV',
  'rssi_dBm',
  'pga_mg',
  'ppv_mmps',
];

const MAX_POINTS = 1500;
const STEPS_MIN = [1, 10, 30, 60, 120, 360, 720, 1440];

/** Picks a bucket size so a range returns at most ~MAX_POINTS points. */
export function autoStep(from, to, nativeStepMin = 10) {
  const minutes = (to - from) / 60000;
  if (minutes / nativeStepMin <= MAX_POINTS) return null;
  return STEPS_MIN.find((s) => minutes / s <= MAX_POINTS) ?? 1440;
}

/**
 * Columnar series for one node: { t: [ms], values: { field: [] }, step }.
 * Long ranges are averaged into time buckets on the server.
 */
export async function nodeSeries(nodeId, { from, to, fields = SERIES_FIELDS, step }) {
  const bucket = step ?? autoStep(from, to);
  const match = { 'meta.nodeId': nodeId, ts: { $gte: from, $lte: to } };
  let docs;
  if (!bucket) {
    const projection = Object.fromEntries(fields.map((f) => [f, 1]));
    docs = await Reading.find(match, { ts: 1, ...projection, _id: 0 })
      .sort({ ts: 1 })
      .lean();
  } else {
    const group = Object.fromEntries(fields.map((f) => [f, { $avg: `$${f}` }]));
    docs = await Reading.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateTrunc: { date: '$ts', unit: 'minute', binSize: bucket } },
          ...group,
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, ts: '$_id', ...Object.fromEntries(fields.map((f) => [f, 1])) } },
    ]);
  }
  return {
    nodeId,
    step: bucket ?? null,
    t: docs.map((d) => new Date(d.ts).getTime()),
    values: Object.fromEntries(fields.map((f) => [f, docs.map((d) => d[f] ?? null)])),
  };
}

/** Latest reading of every node at or before `at` (looking back `lookbackMin`). */
export async function latestAt(siteId, at, lookbackMin = 180) {
  const docs = await Reading.aggregate([
    {
      $match: {
        'meta.siteId': siteId,
        ts: { $lte: at, $gte: new Date(at.getTime() - lookbackMin * 60000) },
      },
    },
    { $sort: { 'meta.nodeId': 1, ts: -1 } },
    { $group: { _id: '$meta.nodeId', doc: { $first: '$$ROOT' } } },
  ]);
  return new Map(docs.map((d) => [d._id, d.doc]));
}

/** One node's newest reading at or before `at` (uses the meta.nodeId + ts index). */
export function latestReading(nodeId, at) {
  return Reading.findOne({ 'meta.nodeId': nodeId, ts: { $lte: at } })
    .sort({ ts: -1 })
    .lean();
}

/** All readings for the given nodes since `since`, grouped by node and sorted by time. */
export async function recentByNode(siteId, nodeIds, since, until) {
  const ts = until ? { $gte: since, $lte: until } : { $gte: since };
  const docs = await Reading.find({ 'meta.siteId': siteId, 'meta.nodeId': { $in: nodeIds }, ts })
    .sort({ ts: 1 })
    .lean();
  const out = new Map(nodeIds.map((id) => [id, []]));
  for (const d of docs) out.get(d.meta.nodeId)?.push(d);
  return out;
}

/**
 * Highest sinking speed across the site per time bucket (relays report no speed, so they drop out).
 * Returns { t: [ms], maxSpeed: [mm/day], nodeId: [] }.
 */
export async function siteSpeedHistory(siteId, from, to, stepMin = 60) {
  const docs = await Reading.aggregate([
    {
      $match: {
        'meta.siteId': siteId,
        ts: { $gte: from, $lte: to },
        speed_mmPerDay: { $ne: null },
      },
    },
    { $sort: { speed_mmPerDay: -1 } },
    {
      $group: {
        _id: { $dateTrunc: { date: '$ts', unit: 'minute', binSize: stepMin } },
        maxSpeed: { $first: '$speed_mmPerDay' },
        nodeId: { $first: '$meta.nodeId' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return {
    step: stepMin,
    t: docs.map((d) => d._id.getTime()),
    maxSpeed: docs.map((d) => +d.maxSpeed.toFixed(2)),
    nodeId: docs.map((d) => d.nodeId),
  };
}

export async function insertReadings(siteId, readings) {
  if (!readings.length) return 0;
  const docs = readings.map(({ nodeId, ...r }) => ({ ...r, meta: { siteId, nodeId } }));
  await Reading.collection.insertMany(docs, { ordered: false });
  return docs.length;
}

export function readingCursor(match) {
  return Reading.find(match).sort({ 'meta.nodeId': 1, ts: 1 }).lean().cursor();
}
