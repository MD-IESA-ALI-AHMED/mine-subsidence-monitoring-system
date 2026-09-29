import { notFound } from '../../middleware/error.js';
import { getSiteNow } from '../../services/time/siteClock.js';
import { nodeSeries } from '../readings/service.js';
import { Node } from './model.js';
import * as nodes from './service.js';

const DAY_MS = 86_400_000;

export async function list(req, res) {
  res.json({ nodes: await nodes.listNodes(req.query.siteId, req.query.at) });
}

export async function getOne(req, res) {
  res.json({ node: await nodes.getNode(req.params.id) });
}

export async function readings(req, res) {
  const node = await Node.findById(req.params.id, { siteId: 1 }).lean();
  if (!node) throw notFound(`Node ${req.params.id} not found`);
  const to = req.query.to ?? (await getSiteNow(node.siteId));
  const from = req.query.from ?? new Date(to.getTime() - DAY_MS);
  res.json(
    await nodeSeries(req.params.id, { from, to, fields: req.query.fields, step: req.query.step }),
  );
}
