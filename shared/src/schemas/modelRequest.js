import { z } from 'zod';
import { NODE_TYPES } from '../constants/nodeTypes.js';

const series = z.array(z.number().finite().nullable());

export const modelNodeSchema = z.object({
  nodeId: z.string(),
  type: z.enum(NODE_TYPES),
  x: z.number(),
  y: z.number(),
  static: z.object({
    distToPanelEdge_m: z.number().nullable(),
    depth_m: z.number().nullable(),
    extractionStatus: z.enum(['extracting', 'extracted', 'planned']).nullable(),
    knotheExpected_mm: z.number().nullable(),
    nearHaulRoad: z.boolean(),
  }),
  series: z.object({
    t: z.array(z.string()),
    sinking_mm: series,
    speed_mmPerDay: series,
    accel_mmPerDay2: series,
    tiltX_urad: series,
    tiltY_urad: series,
    rod_mm: series,
    temp_C: series,
    event: z.array(z.union([z.literal(0), z.literal(1)])),
    mask: z.array(z.union([z.literal(0), z.literal(1)])),
  }),
});

/** POST {MODEL_URL}/predict request body. Missing values are null and marked 1 in mask. */
export const modelRequestSchema = z.object({
  requestId: z.string().uuid(),
  siteId: z.string(),
  generatedAt: z.string(),
  horizonsHours: z.array(z.number().positive()).min(1),
  window: z.object({
    stepMinutes: z.number().int().positive(),
    length: z.number().int().positive(),
  }),
  limits: z.object({
    sinking_mm: z.number(),
    speed_mmPerDay: z.number(),
    tilt_mmPerM: z.number(),
  }),
  nodes: z.array(modelNodeSchema).min(1),
  zones: z.array(z.object({ zoneKey: z.string(), nodeIds: z.array(z.string()) })),
});
