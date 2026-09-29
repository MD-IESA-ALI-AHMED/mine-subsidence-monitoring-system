import { Prediction } from './model.js';
import { SystemStatus } from '../system/model.js';

/** Latest prediction run, with a stale flag when the model has failed since. */
export async function latestPrediction(siteId) {
  const [p, status] = await Promise.all([
    Prediction.findOne({ siteId }).sort({ createdAt: -1 }).lean(),
    SystemStatus.findById(siteId, { model: 1 }).lean(),
  ]);
  if (!p) return null;
  return { ...p, stale: status?.model?.reachable === false };
}

/** Recent forecasts for one node (newest first). */
export async function nodePredictions(nodeId, limit = 5) {
  const docs = await Prediction.find(
    { 'nodes.nodeId': nodeId },
    { createdAt: 1, modelVersion: 1, source: 1, nodes: { $elemMatch: { nodeId } } },
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => ({
    createdAt: d.createdAt,
    modelVersion: d.modelVersion,
    source: d.source,
    ...d.nodes[0],
  }));
}
