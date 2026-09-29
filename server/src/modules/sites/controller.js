import * as sites from './service.js';

export async function getSite(req, res) {
  res.json({ site: await sites.getSite(req.params.siteId) });
}

export async function getTerrain(req, res) {
  const body = await sites.getTerrain(req.params.siteId, req.query);
  res.set('Cache-Control', req.query.at ? 'private, max-age=3600' : 'no-store');
  res.json(body);
}
