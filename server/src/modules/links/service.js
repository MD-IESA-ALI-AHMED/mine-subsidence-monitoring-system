import { MeshState } from '../topology/model.js';
import { Link } from './model.js';

/** Mesh state (root, links, degraded) at a time, or the current one. */
export async function meshStateAt(siteId, at) {
  const q = { siteId, ...(at ? { ts: { $lte: at } } : {}) };
  const state = await MeshState.findOne(q).sort({ ts: -1 }).lean();
  if (state) return state;
  const links = await Link.find({ siteId }).lean();
  return { siteId, ts: null, rootId: null, degraded: false, down: [], links };
}

/** Root changes and degraded periods in a range, for the time scrubber (links left out). */
export async function meshHistory(siteId, from, to) {
  const before = await MeshState.findOne({ siteId, ts: { $lte: from } }, { links: 0 })
    .sort({ ts: -1 })
    .lean();
  const inRange = await MeshState.find({ siteId, ts: { $gt: from, $lte: to } }, { links: 0 })
    .sort({ ts: 1 })
    .lean();
  return [before, ...inRange].filter(Boolean);
}

/** Records a new mesh state and mirrors its links into the links collection. */
export async function recordMeshState(siteId, { ts, rootId, degraded, reason, down = [], links }) {
  await MeshState.create({ siteId, ts, rootId, degraded, reason, down, links });
  await Link.deleteMany({ siteId });
  await Link.insertMany(links.map((l) => ({ _id: `${l.kind}:${l.from}:${l.to}`, siteId, ...l })));
}
