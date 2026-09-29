import { DAY_MS } from '../time/siteTime.js';
import { knotheGrid, knotheSinking, panelModel } from './knothe.js';

// Expected (Knothe) sinking from every advancing longwall panel of a site at a given time.

function models(site) {
  return site.panels
    .filter((p) => p.face?.startAt && p.knothe)
    .map((p) => ({ model: panelModel(p), startAt: new Date(p.face.startAt).getTime() }));
}

const daysSince = (startAt, at) => (new Date(at).getTime() - startAt) / DAY_MS;

export function expectedAt(site, x, y, at) {
  let s = 0;
  for (const { model, startAt } of models(site)) {
    s += knotheSinking(model, x, y, daysSince(startAt, at));
  }
  return s;
}

export function expectedGrid(site, xs, ys, at) {
  const out = new Float32Array(xs.length * ys.length);
  for (const { model, startAt } of models(site)) {
    const g = knotheGrid(model, xs, ys, daysSince(startAt, at));
    for (let i = 0; i < out.length; i += 1) out[i] += g[i];
  }
  return out;
}

/** Current face position of each advancing panel, for the 3D face line. */
export function facePositions(site, at) {
  return models(site).map(({ model, startAt }) => {
    const days = daysSince(startAt, at);
    return {
      panelId: model.panelId,
      x: Math.min(model.xEnd, model.x0 + model.rate * Math.max(0, days)),
      yMin: model.yMin,
      yMax: model.yMax,
    };
  });
}
