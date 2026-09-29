import { dist } from '../field/geometry.js';
import { panelModel } from '../field/knothe.js';
import { buildMeshTree } from '../topology/meshTree.js';
import { buildCProfile } from './field.js';
import { makeRng, uniform } from './rng.js';

function nearestNodeId(nodes, [x, y], filter) {
  let best = null;
  for (const n of nodes) {
    if (!filter(n)) continue;
    const d = dist(n.x, n.y, x, y);
    if (!best || d < best.d) best = { id: n._id, d };
  }
  return best?.id ?? null;
}

/** Per-node constants drawn once from the seeded generator. */
function nodeStatics(cfg, node) {
  const rng = makeRng(cfg.seed, 'static', node._id);
  const { signals } = cfg;
  return {
    driftPhases: signals.sinkingDrift.map(() => rng() * 2 * Math.PI),
    tempOffset: uniform(rng, [-1, 1]),
    batteryStart: uniform(rng, signals.sensorBattery.start_mV),
    batteryDrain: uniform(rng, signals.sensorBattery.drain_mVPerDay),
    pressurePhase: rng() * 2 * Math.PI,
  };
}

/**
 * Everything readingAt() needs, derived once from scenarios.json and the node documents.
 * `nodes` are the node documents (from nodes.json or MongoDB).
 */
export function buildContext(cfg, nodes) {
  const sc = cfg.scenarios;
  const p1 = cfg.site.panels.find((p) => p.panelId === sc.A_longwallTrough.panelId);
  const relays = nodes.filter((n) => n.type === 'relay' || n.type === 'root');
  const isSensor = (n) => n.type === 'sensor' || n.type === 'sensor_rod';
  const I = sc.I_rootFailure;
  const failFrom = I.day * 1440 + I.fromHour * 60;
  const failTo = I.day * 1440 + I.toHour * 60;
  const relayPts = relays.map((r) => ({ id: r._id, x: r.x, y: r.y }));
  const normalTree = buildMeshTree(relayPts, I.failedRoot, cfg.layout.meshRange_m);
  const failTree = buildMeshTree(
    relayPts,
    I.newRoot,
    cfg.layout.meshRange_m,
    new Set([I.failedRoot]),
  );

  const ctx = {
    cfg,
    step: cfg.history.stepMinutes,
    nodes: new Map(nodes.map((n) => [n._id, n])),
    statics: new Map(nodes.map((n) => [n._id, nodeStatics(cfg, n)])),
    p1Model: panelModel(p1),
    p1FaceOffsetMin: p1.face.startOffset_min,
    cProfile: buildCProfile(sc.C_acceleratingOldWorkings),
    silentNodeId: nearestNodeId(nodes, sc.G_silentAfterRise.nearest, isSensor),
    lowBatteryNodeId: nearestNodeId(nodes, sc.H_lowBattery.nearest, isSensor),
    rootFailure: { from: failFrom, to: failTo, failedRoot: I.failedRoot, newRoot: I.newRoot },
    memo: new Map(),
    truckMemo: new Map(),
  };

  /** Mesh state at simulated minute t (scenario I swaps the root for three hours). */
  ctx.meshAt = (t) =>
    t >= failFrom && t < failTo
      ? { rootId: I.newRoot, down: new Set([I.failedRoot]), tree: failTree, degraded: true }
      : { rootId: I.failedRoot, down: new Set(), tree: normalTree, degraded: false };

  return ctx;
}

/** Keeps the memo bounded during long live runs. */
export function trimMemo(ctx, max = 200000) {
  if (ctx.memo.size > max) ctx.memo.clear();
  if (ctx.truckMemo.size > 400) ctx.truckMemo.clear();
}
