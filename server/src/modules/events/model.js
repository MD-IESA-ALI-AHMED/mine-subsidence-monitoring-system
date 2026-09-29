import mongoose from 'mongoose';
import { EVENT_KINDS } from '@subsidence/shared';

const eventSchema = new mongoose.Schema(
  {
    _id: String,
    siteId: { type: String, required: true },
    ts: { type: Date, required: true },
    kind: { type: String, enum: EVENT_KINDS, required: true },
    nodeIds: [String],
    pga_mg: Number,
    ppv_mmps: Number,
    classification: String,
    note: String,
  },
  { versionKey: false },
);
eventSchema.index({ siteId: 1, ts: -1 });

export const Event = mongoose.model('Event', eventSchema, 'events');
