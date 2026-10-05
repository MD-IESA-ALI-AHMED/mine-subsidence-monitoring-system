import * as alerts from './service.js';

const PUBLIC_ACTOR = { id: null, name: 'Public user' };

export async function list(req, res) {
  res.json({ alerts: await alerts.listAlerts(req.query) });
}

export async function acknowledge(req, res) {
  res.json({ alert: await alerts.acknowledgeAlert(req.params.id, PUBLIC_ACTOR, req.body.note) });
}

export async function resolve(req, res) {
  res.json({ alert: await alerts.resolveAlert(req.params.id, PUBLIC_ACTOR, req.body.note) });
}
