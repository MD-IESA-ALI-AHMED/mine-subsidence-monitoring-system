import { isGroundSensorType } from '@subsidence/shared';
import { blastAt, blastTime, nearRoad, passTime, truckPasses } from './disturbances.js';

/**
 * Events (blasts, seating shift, truck transients) whose time falls in [t0, t1), with the nodes
 * that registered them. `readingTimes(node)` says at which minutes a node reports, so a truck pass
 * only becomes an event if some reading actually caught it.
 */
export function eventsBetween(ctx, nodes, t0, t1, readingTimes = null) {
  const sc = ctx.cfg.scenarios;
  const events = [];
  const sensors = nodes.filter((n) => isGroundSensorType(n.type));

  for (let day = Math.floor(t0 / 1440); day <= Math.floor((t1 - 1) / 1440); day += 1) {
    const tb = blastTime(ctx, day);
    if (tb >= t0 && tb < t1) {
      const hits = sensors
        .map((n) => ({ n, b: blastAt(ctx, n, tb, 1) }))
        .filter(({ b }) => b && b.ppv >= sc.D_dailyBlasts.minPpv_mmps);
      events.push({
        _id: `EV-blast-${day}`,
        kind: 'blast',
        tOffset_min: tb,
        nodeIds: hits.map(({ n }) => n._id),
        pga_mg: +Math.max(...hits.map(({ b }) => b.pga)).toFixed(1),
        ppv_mmps: +Math.max(...hits.map(({ b }) => b.ppv)).toFixed(2),
        classification: 'blast',
        note: 'Production blast, open-cast bench south of the site',
      });
      if (day === sc.E_seatingShift.blastDay) {
        events.push({
          _id: `EV-seat-${day}`,
          kind: 'seating_shift',
          tOffset_min: tb,
          nodeIds: [sc.E_seatingShift.nodeId],
          pga_mg: null,
          ppv_mmps: null,
          classification: 'seating_shift',
          note: `Permanent tilt step of ${sc.E_seatingShift.tiltStepX_urad} µrad after the blast; node re-baselined, no ground movement`,
        });
      }
    }

    for (const pass of truckPasses(ctx, day)) {
      const hit = [];
      for (const n of sensors.filter((s) => nearRoad(ctx, s))) {
        const tp = passTime(ctx, pass, n);
        if (tp < t0 || tp >= t1) continue;
        const times = readingTimes ? readingTimes(n) : ctx.step;
        const first = Math.ceil(tp / times) * times;
        if (first < tp + pass.duration) hit.push(n._id);
      }
      if (!hit.length) continue;
      events.push({
        _id: `EV-truck-${pass.id}`,
        kind: 'vehicle_transient',
        tOffset_min: Math.round(pass.start),
        nodeIds: hit,
        pga_mg: +pass.pga.toFixed(1),
        ppv_mmps: +(pass.pga / 9).toFixed(2),
        classification: 'vehicle_transient',
        note: `Haul truck, ${pass.eastbound ? 'eastbound' : 'westbound'}; tilt recovered`,
      });
    }
  }
  return events.sort((a, b) => a.tOffset_min - b.tOffset_min);
}
