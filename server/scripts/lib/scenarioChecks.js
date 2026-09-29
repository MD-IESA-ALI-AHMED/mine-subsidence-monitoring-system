import { dist } from '../../src/services/field/geometry.js';
import { expectedSinking } from '../../src/services/simulator/field.js';

// Prints the generation summary and a PASS/FAIL line per scripted scenario.

const fmt = (v, d = 1) => (v == null ? '—' : Number(v).toFixed(d));

function nearestSensors(nodes, [x, y], k) {
  return nodes
    .filter((n) => n.type === 'sensor' || n.type === 'sensor_rod')
    .map((n) => ({ n, d: dist(n.x, n.y, x, y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map(({ n }) => n);
}

export function runChecks({ cfg, ctx, nodes, readings, events }) {
  const sc = cfg.scenarios;
  const byNode = new Map();
  for (const r of readings) {
    if (!byNode.has(r.nodeId)) byNode.set(r.nodeId, new Map());
    byNode.get(r.nodeId).set(r.tOffset_min, r);
  }
  const at = (id, day) => byNode.get(id)?.get(Math.round((day * 1440) / 10) * 10);
  const last = (id) => [...(byNode.get(id)?.values() ?? [])].at(-1);
  const end = cfg.history.days - 1 / 144;
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass, detail });

  const counts = {};
  for (const n of nodes) counts[n.type] = (counts[n.type] ?? 0) + 1;
  console.log('Nodes:', JSON.stringify(counts), `total ${nodes.length}`);
  console.log(`Readings: ${readings.length}   Events: ${events.length}`);
  check(
    'Node counts',
    counts.sensor === 44 &&
      counts.sensor_rod === 4 &&
      counts.relay === 7 &&
      counts.root === 1 &&
      counts.reference === 2 &&
      counts.reference_rtk === 2,
    `${nodes.length} nodes`,
  );

  // A: trough over P1 follows Knothe outside the B and C clusters.
  const bNodes = nearestSensors(nodes, sc.B_excessSinking.centre, 5);
  const cNodes = nearestSensors(nodes, sc.C_acceleratingOldWorkings.centre, 6);
  const nearAnomaly = (n) =>
    dist(n.x, n.y, ...sc.B_excessSinking.centre) < 2 * sc.B_excessSinking.radius_m ||
    dist(n.x, n.y, ...sc.C_acceleratingOldWorkings.centre) <
      2 * sc.C_acceleratingOldWorkings.radius_m;
  let peakA = 0;
  let worstDev = 0;
  for (const n of nodes.filter((m) => m.type.startsWith('sensor') && !nearAnomaly(m))) {
    const r = at(n._id, end);
    if (!r) continue;
    peakA = Math.max(peakA, r.sinking_mm);
    worstDev = Math.max(
      worstDev,
      Math.abs(r.sinking_mm - expectedSinking(ctx, n.x, n.y, r.tOffset_min)),
    );
  }
  check(
    'A longwall trough',
    peakA > 100 && worstDev < 1,
    `peak ${fmt(peakA)} mm, max deviation from Knothe ${fmt(worstDev, 2)} mm`,
  );

  // B: extra sinking over the south-east corner from day 4.
  const bExcess = bNodes.map((n) => {
    const r = at(n._id, end);
    return r.sinking_mm - expectedSinking(ctx, n.x, n.y, r.tOffset_min);
  });
  const bBefore = bNodes.map((n) => {
    const r = at(n._id, 3.9);
    return r.sinking_mm - expectedSinking(ctx, n.x, n.y, r.tOffset_min);
  });
  check(
    'B excess sinking',
    Math.max(...bExcess) > 10 && Math.max(...bBefore.map(Math.abs)) < 1,
    `${bNodes.map((n) => n._id).join(' ')} excess at day 7: ${bExcess.map((v) => fmt(v)).join(', ')} mm`,
  );

  // C: accelerating zone over OW1.
  const cPeak = Math.max(
    ...cNodes.map((n) => at(n._id, end)?.sinking_mm ?? last(n._id).sinking_mm),
  );
  const cAt5 = Math.max(...cNodes.map((n) => Math.abs(at(n._id, 4.9).sinking_mm)));
  const worstC = cNodes.find((n) => n._id !== ctx.silentNodeId) ?? cNodes[0];
  const v6 = at(worstC._id, 6).speed_mmPerDay;
  const v7 = at(worstC._id, end).speed_mmPerDay;
  check(
    'C accelerating zone',
    cPeak >= 38 && cPeak <= 60 && cAt5 < 2 && v7 > v6,
    `${cNodes.map((n) => n._id).join(' ')} peak ${fmt(cPeak)} mm at day 7 (target 40), day 5 ${fmt(cAt5, 2)} mm, speed ${fmt(v6)} -> ${fmt(v7)} mm/day, A=${fmt(ctx.cProfile.A)}`,
  );

  const blasts = events.filter((e) => e.kind === 'blast');
  check(
    'D daily blasts',
    blasts.length === cfg.history.days,
    `${blasts.length} blasts, max PPV ${fmt(Math.max(...blasts.map((b) => b.ppv_mmps)), 2)} mm/s`,
  );

  const E = sc.E_seatingShift;
  const tb = E.blastDay * 1440 + sc.D_dailyBlasts.time_h * 60;
  // Three readings either side of the blast: short enough that the trough slope barely changes.
  const mean = (id, t0, t1) => {
    const xs = [...byNode.get(id).values()].filter(
      (r) => r.tOffset_min >= t0 && r.tOffset_min < t1,
    );
    return xs.reduce((s, r) => s + r.tiltX_urad, 0) / xs.length;
  };
  const step = mean(E.nodeId, tb, tb + 30) - mean(E.nodeId, tb - 30, tb);
  check(
    'E seating shift',
    Math.abs(step - E.tiltStepX_urad) < 40,
    `${E.nodeId} tilt X step ${fmt(step)} µrad`,
  );

  const trucks = events.filter((e) => e.kind === 'vehicle_transient');
  check(
    'F truck transients',
    trucks.length > 20,
    `${trucks.length} caught passes on ${new Set(trucks.flatMap((e) => e.nodeIds)).size} road-side nodes`,
  );

  const g = last(ctx.silentNodeId);
  check(
    'G silent after rise',
    g.tOffset_min < sc.G_silentAfterRise.silentFromDay * 1440 && g.speed_mmPerDay > 3,
    `${ctx.silentNodeId} last reading day ${fmt(g.tOffset_min / 1440, 2)}, speed ${fmt(g.speed_mmPerDay)} mm/day`,
  );

  const h = last(ctx.lowBatteryNodeId);
  check(
    'H low battery',
    Math.abs(h.tOffset_min / 1440 - 2) < 0.3,
    `${ctx.lowBatteryNodeId} last reading day ${fmt(h.tOffset_min / 1440, 2)} at ${h.battery_mV} mV`,
  );

  const { from, to, failedRoot } = ctx.rootFailure;
  const gap = [...byNode.get(failedRoot).keys()].filter((t) => t >= from && t < to).length;
  const resent = readings.filter((r) => r.flags.resent).length;
  check(
    'I root failure',
    gap === 0 && resent > 0,
    `${failedRoot} silent ${fmt((to - from) / 60, 0)} h, ${resent} readings resent`,
  );

  const refMax = Math.max(
    ...nodes
      .filter((n) => n.type.startsWith('reference'))
      .map((n) => Math.abs(at(n._id, end).sinking_mm)),
  );
  check('Reference units stable', refMax < 0.5, `max |sinking| ${fmt(refMax, 2)} mm`);

  for (const r of results)
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(24)} ${r.detail}`);
  return results.every((r) => r.pass);
}
