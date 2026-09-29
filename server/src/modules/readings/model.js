import mongoose from 'mongoose';

const flag = { type: Boolean, default: false };

const readingSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true },
    meta: { siteId: String, nodeId: String },
    tiltX_urad: Number,
    tiltY_urad: Number,
    tiltSigma_urad: Number,
    sinking_mm: Number,
    sinkingSigma_mm: Number,
    speed_mmPerDay: Number,
    accel_mmPerDay2: Number,
    rod_mm: Number,
    pressure_Pa: Number,
    temp_C: Number,
    pga_mg: Number,
    ppv_mmps: Number,
    fDom_Hz: Number,
    battery_mV: Number,
    solar_mV: Number,
    rssi_dBm: Number,
    seq: Number,
    flags: {
      shaken: flag,
      eventInWindow: flag,
      lowBattery: flag,
      rodInvalid: flag,
      fastMode: flag,
      resent: flag,
      masked: flag,
    },
  },
  {
    versionKey: false,
    timeseries: { timeField: 'ts', metaField: 'meta', granularity: 'minutes' },
    autoCreate: true,
  },
);
readingSchema.index({ 'meta.nodeId': 1, ts: -1 });

export const Reading = mongoose.model('Reading', readingSchema, 'readings');
