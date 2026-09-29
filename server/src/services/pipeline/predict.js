import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { Prediction } from '../../modules/predictions/model.js';
import { buildModelRequest } from '../modelClient/buildRequest.js';
import { callModel } from '../modelClient/callModel.js';

const HOUR_MS = 3_600_000;

/**
 * Model step. Calls the model at most every MODEL_MIN_INTERVAL_MIN (site time); otherwise, or when
 * the model fails, uses the last good prediction. Never falls back to mock output in remote mode:
 * the stored prediction is simply older, and systemStatus says the model is unreachable.
 *
 * Returns { prediction, fresh, error, request }.
 */
export async function predictStep({ inputs, zones, now, runId, useModel }) {
  const { site } = inputs;
  const last = await Prediction.findOne({ siteId: site._id, createdAt: { $lte: now } })
    .sort({ createdAt: -1 })
    .lean();
  if (!useModel || !zones.length) return { prediction: last, fresh: false, error: null };
  const minGapMs = env.MODEL_MIN_INTERVAL_MIN * 60000;
  if (last && now - last.createdAt < minGapMs)
    return { prediction: last, fresh: false, error: null };

  const request = buildModelRequest({
    site,
    nodes: inputs.nodes,
    metrics: inputs.metrics,
    zones,
    readingsByNode: inputs.readingsByNode,
    now,
    events: inputs.events,
  });
  try {
    const { response, latency_ms } = await callModel(request);
    const currentBy = new Map(
      request.nodes.map((n) => [n.nodeId, n.series.sinking_mm.findLast((v) => v != null)]),
    );
    const doc = await Prediction.create({
      siteId: site._id,
      runId,
      requestId: request.requestId,
      createdAt: now,
      modelVersion: response.modelVersion,
      source: env.MODEL_MODE,
      nodes: response.nodes.map((n) => ({ ...n, current_mm: currentBy.get(n.nodeId) ?? null })),
      zones: response.zones,
      latency_ms,
    });
    return { prediction: doc.toObject(), fresh: true, error: null, latency_ms };
  } catch (err) {
    logger.warn({ err: err.message, code: err.code }, 'Model call failed; keeping last prediction');
    return { prediction: last, fresh: false, error: err.message };
  }
}

/**
 * Model time to limit for a zone, from a prediction that may be older than now: the stored
 * estimate minus the hours that have passed since it was made.
 */
export function modelTCrit(prediction, zone, now) {
  if (!prediction) return null;
  const age = (now - new Date(prediction.createdAt)) / HOUR_MS;
  const z = prediction.zones?.find((p) => p.zoneKey === zone.zoneKey);
  let t = z?.tCrit_h ?? null;
  if (t == null) {
    const nodeT = (prediction.nodes ?? [])
      .filter((n) => zone.nodeIds.includes(n.nodeId) && n.tCrit_h != null)
      .map((n) => n.tCrit_h);
    t = nodeT.length ? Math.min(...nodeT) : null;
  }
  return t == null ? null : Math.max(0, +(t - age).toFixed(1));
}
