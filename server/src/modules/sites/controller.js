import { getSiteNow } from '../../services/time/siteClock.js';
import { siteSpeedHistory } from '../readings/service.js';
import * as sites from './service.js';

const DAY_MS = 86_400_000;

export async function getSite(req, res) {
  res.json({ site: await sites.getSite(req.params.siteId) });
}

export async function getTerrain(req, res) {
  const body = await sites.getTerrain(req.params.siteId, req.query);
  res.set('Cache-Control', req.query.at ? 'private, max-age=3600' : 'no-store');
  res.json(body);
}

export async function getSpeedHistory(req, res) {
  const to = req.query.to ?? (await getSiteNow(req.params.siteId));
  const from = req.query.from ?? new Date(to.getTime() - 7 * DAY_MS);
  res.json(await siteSpeedHistory(req.params.siteId, from, to, req.query.step));
}
