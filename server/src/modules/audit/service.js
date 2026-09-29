import { AuditLog } from './model.js';
import { logger } from '../../config/logger.js';

/** Appends an audit entry. Never throws: a failed audit write must not break the action. */
export async function recordAudit({ userId = null, action, target = null, details = null }) {
  try {
    await AuditLog.create({ userId: userId ? String(userId) : null, action, target, details });
  } catch (err) {
    logger.error({ err, action }, 'Audit write failed');
  }
}

export async function listAudit({ limit = 100 } = {}) {
  return AuditLog.find().sort({ ts: -1 }).limit(limit).lean();
}
