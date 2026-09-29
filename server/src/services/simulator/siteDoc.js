import { roadY } from './disturbances.js';

/** The site document (site.json) derived from scenarios.json. */
export function buildSiteDoc(cfg) {
  const s = cfg.site;
  const road = s.haulRoads[0];
  const ctxLike = { cfg };
  const polyline = [];
  for (let x = s.extent.xMin; x <= s.extent.xMax; x += 10) {
    polyline.push([x, +roadY(ctxLike, x).toFixed(2)]);
  }
  return {
    _id: s.id,
    name: s.name,
    timezone: s.timezone,
    crs: 'local-metres',
    origin: s.origin,
    extent: s.extent,
    ground: s.ground,
    panels: s.panels,
    haulRoads: [{ id: road.id, polyline, width_m: 8 }],
    villageEdge: {
      id: s.villageEdge.id,
      name: s.villageEdge.name,
      polyline: [s.villageEdge.from, s.villageEdge.to],
    },
    controlRoom: s.controlRoom,
    thresholds: s.thresholds,
    blastSource: cfg.scenarios.D_dailyBlasts.source,
  };
}
