import mongoose from 'mongoose';

const horizonSchema = new mongoose.Schema(
  { h: Number, p10_mm: Number, p50_mm: Number, p90_mm: Number },
  { _id: false },
);

const predictionSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true },
    runId: String,
    requestId: String,
    createdAt: { type: Date, default: Date.now },
    modelVersion: String,
    source: { type: String, enum: ['remote', 'mock'] },
    nodes: [
      {
        _id: false,
        nodeId: String,
        horizons: [horizonSchema],
        current_mm: Number,
        speed_mmPerDay: Number,
        strainRate_perDay: Number,
        tCrit_h: Number,
      },
    ],
    zones: [{ _id: false, zoneKey: String, tCrit_h: Number, confidence: Number }],
    latency_ms: Number,
  },
  { versionKey: false },
);
predictionSchema.index({ siteId: 1, createdAt: -1 });
predictionSchema.index({ 'nodes.nodeId': 1, createdAt: -1 });

export const Prediction = mongoose.model('Prediction', predictionSchema, 'predictions');
