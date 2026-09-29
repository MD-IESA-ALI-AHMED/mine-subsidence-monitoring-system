import { z } from 'zod';

const num = z.number().finite().nullable();

export const readingFlagsSchema = z
  .object({
    shaken: z.boolean().default(false),
    eventInWindow: z.boolean().default(false),
    lowBattery: z.boolean().default(false),
    rodInvalid: z.boolean().default(false),
    fastMode: z.boolean().default(false),
    resent: z.boolean().default(false),
    masked: z.boolean().default(false),
  })
  .partial();

/** One decoded telemetry reading, as stored and as accepted by POST /api/ingest/frames. */
export const readingSchema = z.object({
  nodeId: z.string().min(1).max(16),
  ts: z.coerce.date(),
  seq: z.number().int().nonnegative().optional(),
  tiltX_urad: num.optional(),
  tiltY_urad: num.optional(),
  tiltSigma_urad: num.optional(),
  sinking_mm: num.optional(),
  sinkingSigma_mm: num.optional(),
  speed_mmPerDay: num.optional(),
  accel_mmPerDay2: num.optional(),
  rod_mm: num.optional(),
  pressure_Pa: num.optional(),
  temp_C: num.optional(),
  pga_mg: num.optional(),
  ppv_mmps: num.optional(),
  fDom_Hz: num.optional(),
  battery_mV: num.optional(),
  solar_mV: num.optional(),
  rssi_dBm: num.optional(),
  flags: readingFlagsSchema.optional(),
});

export const ingestFramesSchema = z.object({
  siteId: z.string().min(1),
  frames: z.array(readingSchema).min(1).max(5000),
});

/** Payload item of the readings:batch socket event. */
export const liveReadingSchema = readingSchema.pick({
  nodeId: true,
  ts: true,
  sinking_mm: true,
  speed_mmPerDay: true,
  tiltX_urad: true,
  tiltY_urad: true,
  battery_mV: true,
  rssi_dBm: true,
  flags: true,
});
