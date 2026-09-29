import { SOCKET_EVENTS } from '@subsidence/shared';
import { logger } from '../../config/logger.js';
import { Zone } from '../../modules/zones/model.js';
import { publish } from '../../realtime/bus.js';
import { evaluateGate } from '../gate/gate.js';
import { buildZones } from '../zones/buildZones.js';
import { assessZones } from './assess.js';
import { loadInputs } from './loadInputs.js';
import {
  saveAlerts,
  saveFastMode,
  saveNodeStatuses,
  saveSystemStatus,
  saveZones,
} from './persist.js';
import { predictStep } from './predict.js';

const running = new Map(); // siteId -> Promise (one run per site at a time)

/**
 * gate -> zones -> model -> severity -> alerts, for site time `now`.
 * opts.live: false for history backfill (no node-state writes, no model call, no socket output).
 * Idempotent per runId (site + time); never runs twice at once for one site.
 */
export async function runPipeline(siteId, now, { live = true, useModel = live } = {}) {
  const runId = `${siteId}:${now.toISOString()}`;
  if (running.has(siteId)) return { skipped: 'busy', runId };
  // Take the lock before the first await, or two callers could both get past the check.
  const job = (async () => {
    if (await Zone.exists({ siteId, runId })) return { skipped: 'done', runId };
    return execute(siteId, now, runId, { live, useModel });
  })().finally(() => running.delete(siteId));
  running.set(siteId, job);
  return job;
}

async function execute(siteId, now, runId, { live, useModel }) {
  const started = Date.now();
  const inputs = await loadInputs(siteId, now);
  const th = inputs.site.thresholds;
  if (live) await saveNodeStatuses(siteId, inputs);

  const gateNodes = [...inputs.metrics.values()].filter((m) => m.measuring && !m.excluded);
  const prevGate = inputs.status?.gate ?? {};
  const gate = evaluateGate(
    gateNodes,
    th,
    live ? prevGate : { open: inputs.prevZones.length > 0 },
    now,
  );
  if (live && gate.changed) {
    publish(SOCKET_EVENTS.GATE_CHANGED, siteId, { open: gate.open, reason: gate.reason });
  }

  let assessed = [];
  let predict = { prediction: null, fresh: false, error: null };
  if (gate.open || inputs.prevZones.length) {
    const zones = gate.open
      ? buildZones({
          metrics: [...inputs.metrics.values()],
          site: inputs.site,
          prevZones: inputs.prevZones,
          at: now,
        })
      : [];
    if (live) await saveFastMode(siteId, inputs, zones);
    predict = await predictStep({ inputs, zones, now, runId, useModel });
    assessed = assessZones({
      zones,
      metrics: inputs.metrics,
      thresholds: th,
      prediction: predict.prediction,
      now,
    });
  }

  const saved = await saveZones(siteId, runId, assessed, now);
  const alerts = await saveAlerts(siteId, inputs, assessed, now);
  const status = await saveSystemStatus(siteId, { inputs, gate, predict, now, live });

  if (live) {
    publish(SOCKET_EVENTS.ZONES_UPDATED, siteId, saved);
    if (predict.fresh) {
      const p = predict.prediction;
      publish(SOCKET_EVENTS.PREDICTION_NEW, siteId, {
        createdAt: p.createdAt,
        modelVersion: p.modelVersion,
        source: p.source,
        latency_ms: p.latency_ms,
        nodes: p.nodes.length,
        zones: p.zones,
      });
    }
  }
  const ms = Date.now() - started;
  logger.debug({ runId, zones: saved.length, alerts: alerts.length, ms }, 'Pipeline run');
  return { runId, gate, zones: saved, alerts, status, prediction: predict, ms };
}
