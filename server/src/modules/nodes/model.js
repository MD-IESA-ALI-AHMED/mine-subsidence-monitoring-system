import mongoose from 'mongoose';
import { NODE_STATUSES, NODE_TYPES } from '@subsidence/shared';

const nodeSchema = new mongoose.Schema(
  {
    _id: String,
    siteId: { type: String, required: true },
    type: { type: String, enum: NODE_TYPES, required: true },
    label: String,
    x: Number,
    y: Number,
    z_ground: Number,
    installedAt: Date,
    azimuth_deg: Number,
    parentRelayId: { type: String, default: null },
    backupRelayId: { type: String, default: null },
    meshParentId: { type: String, default: null },
    meshLayer: { type: Number, default: null },
    hasRod: { type: Boolean, default: false },
    hasRtk: { type: Boolean, default: false },
    firmware: String,
    status: { type: String, enum: NODE_STATUSES, default: 'online' },
    lastSeenAt: { type: Date, default: null },
    battery: { pct: Number, mV: Number },
    rssi_dBm: { type: Number, default: null },
    fastMode: { type: Boolean, default: false },
    // Latest values, denormalised so GET /nodes needs one query.
    latest: {
      sinking_mm: Number,
      speed_mmPerDay: Number,
      accel_mmPerDay2: Number,
      tiltX_urad: Number,
      tiltY_urad: Number,
      temp_C: Number,
      rod_mm: Number,
    },
    rebaselinedAt: { type: Date, default: null },
  },
  { versionKey: false },
);
nodeSchema.index({ siteId: 1, type: 1 });

export const Node = mongoose.model('Node', nodeSchema, 'nodes');
