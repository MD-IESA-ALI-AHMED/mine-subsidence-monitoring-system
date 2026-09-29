import mongoose from 'mongoose';
import { TIERS } from '@subsidence/shared';

const zoneSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true },
    zoneKey: { type: String, required: true },
    runId: String,
    createdAt: { type: Date, default: Date.now },
    nodeIds: [String],
    hull: [[Number]],
    area_m2: Number,
    centroid: [Number],
    peakSinking_mm: Number,
    peakExcess_mm: Number,
    worstNodeId: String,
    meanSpeed_mmPerDay: Number,
    meanExcessSpeed_mmPerDay: Number,
    maxSpeed_mmPerDay: Number,
    maxExcessSpeed_mmPerDay: Number,
    accelerating: Boolean,
    nearVillage: Boolean,
    hasSilentAfterRise: Boolean,
    knotheExpected_mm: Number,
    deviation_mm: Number,
    severity: {
      score: Number,
      tier: { type: String, enum: TIERS },
      parts: {
        sinking: Number,
        speed: Number,
        accel: Number,
        extent: Number,
        deviation: Number,
        proximity: Number,
      },
      overrides: [String],
    },
    tCrit: { model_h: Number, inverseVelocity_h: Number, used_h: Number, method: String },
    inverseVelocity: {
      points: [[Number]], // [hoursFromNow (negative), 1/speed]
      slope: Number,
      intercept: Number,
    },
    active: { type: Boolean, default: true },
  },
  { versionKey: false },
);
zoneSchema.index({ siteId: 1, active: 1, createdAt: -1 });
zoneSchema.index({ siteId: 1, zoneKey: 1, createdAt: -1 });

export const Zone = mongoose.model('Zone', zoneSchema, 'zones');
