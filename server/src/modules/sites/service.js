import { isRelayType } from '@subsidence/shared';
import { notFound } from '../../middleware/error.js';
import { facePositions } from '../../services/field/expected.js';
import { buildSinkingField, toBase64 } from '../../services/field/sinkingField.js';
import { getSiteNow } from '../../services/time/siteClock.js';
import { Node } from '../nodes/model.js';
import { latestAt } from '../readings/service.js';
import { Site } from './model.js';

const TERRAIN_CACHE_MAX = 64;
const terrainCache = new Map();

export async function getSite(siteId) {
  const site = await Site.findById(siteId).lean();
  if (!site) throw notFound(`Site ${siteId} not found`);
  return site;
}

/** Measured sinking at every measuring node, now or at a past time. */
async function measuredPoints(siteId, at) {
  const nodes = await Node.find({ siteId }, { type: 1, x: 1, y: 1, latest: 1 }).lean();
  const measuring = nodes.filter((n) => !isRelayType(n.type));
  if (!at) {
    return measuring
      .filter((n) => n.latest?.sinking_mm != null)
      .map((n) => ({ x: n.x, y: n.y, sinking_mm: n.latest.sinking_mm }));
  }
  const latest = await latestAt(siteId, at, 24 * 60);
  return measuring
    .filter((n) => latest.get(n._id)?.sinking_mm != null)
    .map((n) => ({ x: n.x, y: n.y, sinking_mm: latest.get(n._id).sinking_mm }));
}

/**
 * Terrain grid for the 3D view: ground elevation and sinking as base64 Float32 arrays
 * (row-major, y rows from yMin, x columns from xMin).
 */
export async function getTerrain(siteId, { res = 4, at } = {}) {
  const site = await getSite(siteId);
  const when = at ?? (await getSiteNow(siteId));
  const key = at ? `${siteId}|${res}|${Math.floor(at.getTime() / 600000)}` : null;
  if (key && terrainCache.has(key)) return terrainCache.get(key);

  const points = await measuredPoints(siteId, at);
  const field = buildSinkingField(site, points, when, res);
  let maxSinking = 0;
  for (const v of field.sinking) maxSinking = Math.max(maxSinking, v);
  const body = {
    siteId,
    at: when.toISOString(),
    res,
    nx: field.nx,
    ny: field.ny,
    xMin: site.extent.xMin,
    yMin: site.extent.yMin,
    elevation: toBase64(field.elevation),
    sinking: toBase64(field.sinking),
    maxSinking_mm: +maxSinking.toFixed(2),
    faces: facePositions(site, when),
  };
  if (key) {
    if (terrainCache.size >= TERRAIN_CACHE_MAX)
      terrainCache.delete(terrainCache.keys().next().value);
    terrainCache.set(key, body);
  }
  return body;
}
