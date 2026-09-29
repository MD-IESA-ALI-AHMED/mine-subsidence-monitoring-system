import { notFound } from '../../middleware/error.js';
import { Zone } from './model.js';

/**
 * Zones active at a time: the zone documents of the most recent pipeline run at or before `at`.
 * Each run writes every active zone, so one run's documents are the full picture.
 */
export async function zonesAt(siteId, at) {
  const q = { siteId, ...(at ? { createdAt: { $lte: at } } : {}) };
  const last = await Zone.findOne(q, { runId: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
  if (!last) return [];
  return Zone.find({ siteId, runId: last.runId, active: true }).lean();
}

export async function zoneHistory(siteId, zoneKey, { from, limit = 500 } = {}) {
  const q = { siteId, zoneKey, ...(from ? { createdAt: { $gte: from } } : {}) };
  const docs = await Zone.find(q, {
    createdAt: 1,
    severity: 1,
    tCrit: 1,
    peakSinking_mm: 1,
    meanSpeed_mmPerDay: 1,
    active: 1,
    nodeIds: 1,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  if (!docs.length) throw notFound(`Zone ${zoneKey} not found`);
  return docs.reverse();
}
