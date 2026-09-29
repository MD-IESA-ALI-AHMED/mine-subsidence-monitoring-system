import { SOCKET_EVENTS, TIERS, tierRank } from '@subsidence/shared';
import { conflict, notFound } from '../../middleware/error.js';
import { publish } from '../../realtime/bus.js';
import { recordAudit } from '../audit/service.js';
import { Alert } from './model.js';

export async function listAlerts({ siteId, state, tier, limit = 200 }) {
  const q = { siteId };
  if (state?.length) q.state = { $in: state };
  if (tier?.length) q.tier = { $in: tier };
  return Alert.find(q).sort({ createdAt: -1 }).limit(limit).lean();
}

async function transition(id, user, note, { from, to, action }) {
  const alert = await Alert.findById(id);
  if (!alert) throw notFound('Alert not found');
  if (!from.includes(alert.state)) throw conflict(`Alert is already ${alert.state}`);
  const now = new Date();
  alert.state = to;
  alert.note = note;
  if (to === 'acknowledged')
    Object.assign(alert, { acknowledgedBy: user.name, acknowledgedAt: now });
  if (to === 'resolved') Object.assign(alert, { resolvedBy: user.name, resolvedAt: now });
  alert.history.push({ ts: now, action, by: user.name, note, tier: alert.tier });
  await alert.save();
  await recordAudit({
    userId: user.id,
    action: `alert_${action}`,
    target: String(alert._id),
    details: { note },
  });
  const doc = alert.toObject();
  publish(SOCKET_EVENTS.ALERT_UPDATED, alert.siteId, doc);
  return doc;
}

export const acknowledgeAlert = (id, user, note) =>
  transition(id, user, note, { from: ['open'], to: 'acknowledged', action: 'acknowledge' });

export const resolveAlert = (id, user, note) =>
  transition(id, user, note, { from: ['open', 'acknowledged'], to: 'resolved', action: 'resolve' });

/**
 * Raises an alert when a zone's tier rises. The same zone never has two unresolved alerts at the
 * same tier; a higher tier supersedes lower open ones. Returns the new alert or null.
 */
export async function raiseZoneAlert({
  siteId,
  zoneKey,
  nodeIds,
  tier,
  title,
  reason,
  at,
  kind = 'zone',
}) {
  if (tierRank(tier) < tierRank('watch')) return null;
  const unresolved = await Alert.find({ siteId, zoneKey, kind, state: { $ne: 'resolved' } }).lean();
  if (unresolved.some((a) => tierRank(a.tier) >= tierRank(tier))) return null;
  const alert = await Alert.create({
    siteId,
    zoneKey,
    nodeIds,
    kind,
    tier,
    title,
    reason,
    createdAt: at,
    history: [{ ts: at, action: 'raised', by: 'system', note: reason, tier }],
  });
  const doc = alert.toObject();
  publish(SOCKET_EVENTS.ALERT_NEW, siteId, doc);
  return doc;
}

export const ALERT_TIERS = TIERS;
