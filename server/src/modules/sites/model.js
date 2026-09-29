import mongoose from 'mongoose';

const { Mixed } = mongoose.Schema.Types;

const panelSchema = new mongoose.Schema(
  {
    panelId: String,
    name: String,
    kind: String,
    depth_m: Number,
    seamThickness_m: Number,
    polygon: [[Number]],
    extractionStatus: { type: String, enum: ['extracting', 'extracted', 'planned'] },
    advanceDirection: String,
    face: Mixed, // { start_m, end_m, rate_mPerDay, startAt }
    knothe: Mixed, // { subsidenceFactor, tanBeta, lagTau_days }
  },
  { _id: false },
);

const siteSchema = new mongoose.Schema(
  {
    _id: String,
    name: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    crs: { type: String, default: 'local-metres' },
    origin: { lat: Number, lon: Number },
    extent: { xMin: Number, xMax: Number, yMin: Number, yMax: Number },
    ground: Mixed,
    panels: [panelSchema],
    haulRoads: [{ _id: false, id: String, polyline: [[Number]], width_m: Number }],
    villageEdge: { id: String, name: String, polyline: [[Number]] },
    controlRoom: { x: Number, y: Number },
    blastSource: [Number],
    thresholds: Mixed,
    historyStartAt: Date,
    simulated: { type: Boolean, default: false },
  },
  { versionKey: false },
);

export const Site = mongoose.model('Site', siteSchema, 'sites');
