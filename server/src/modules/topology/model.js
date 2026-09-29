import mongoose from 'mongoose';

// Mesh layout history, so GET /links?at= can show how the tree looked at a past time.
const meshStateSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true },
    ts: { type: Date, required: true },
    rootId: String,
    degraded: Boolean,
    reason: String,
    down: [String],
    links: [{ _id: false, from: String, to: String, kind: String, quality_0to1: Number }],
  },
  { versionKey: false },
);
meshStateSchema.index({ siteId: 1, ts: -1 });

export const MeshState = mongoose.model('MeshState', meshStateSchema, 'meshHistory');
