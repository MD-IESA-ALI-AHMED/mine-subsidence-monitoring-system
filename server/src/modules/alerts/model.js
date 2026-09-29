import mongoose from 'mongoose';
import { ALERT_STATES, TIERS } from '@subsidence/shared';

const alertSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true },
    zoneKey: { type: String, default: null },
    nodeIds: [String],
    kind: { type: String, enum: ['zone', 'inspect_node'], default: 'zone' },
    tier: { type: String, enum: TIERS, required: true },
    title: String,
    reason: String,
    createdAt: { type: Date, default: Date.now },
    state: { type: String, enum: ALERT_STATES, default: 'open' },
    acknowledgedBy: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    note: { type: String, default: null },
    history: [{ _id: false, ts: Date, action: String, by: String, note: String, tier: String }],
  },
  { versionKey: false },
);
alertSchema.index({ siteId: 1, state: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema, 'alerts');
