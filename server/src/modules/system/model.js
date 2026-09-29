import mongoose from 'mongoose';

// One document per site, updated by the pipeline and the simulator.
const systemStatusSchema = new mongoose.Schema(
  {
    _id: String, // siteId
    meshOnline: Number,
    meshTotal: Number,
    rootId: String,
    degraded: { type: Boolean, default: false },
    degradedReason: { type: String, default: null },
    degradedSince: { type: Date, default: null },
    lastReadingAt: Date,
    // Simulated "now" when the simulator drives the site; null for field data.
    siteClock: { type: Date, default: null },
    simulated: { type: Boolean, default: false },
    // Site minutes per real minute (1 for field data), so clients can run the clock between updates.
    simSpeed: { type: Number, default: 1 },
    model: {
      mode: { type: String, enum: ['remote', 'mock'] },
      reachable: { type: Boolean, default: true },
      lastRunAt: Date,
      lastGoodAt: Date,
      lastLatency_ms: Number,
      lastError: { type: String, default: null },
      modelVersion: String,
    },
    gate: {
      open: { type: Boolean, default: false },
      openedAt: Date,
      reason: String,
      zmax_mm: Number,
      zmaxNodeId: String,
    },
    updatedAt: Date,
  },
  { versionKey: false },
);

export const SystemStatus = mongoose.model('SystemStatus', systemStatusSchema, 'systemStatus');
