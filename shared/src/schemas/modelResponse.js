import { z } from 'zod';

const finite = z.number().finite();

export const horizonSchema = z
  .object({ h: finite.positive(), p10_mm: finite, p50_mm: finite, p90_mm: finite })
  .refine((v) => v.p10_mm <= v.p50_mm && v.p50_mm <= v.p90_mm, {
    message: 'Expected p10 <= p50 <= p90',
  });

/** Response of POST {MODEL_URL}/predict. tCrit_h is null when no limit is crossed within 72 h. */
export const modelResponseSchema = z.object({
  requestId: z.string(),
  modelVersion: z.string().min(1),
  nodes: z.array(
    z.object({
      nodeId: z.string(),
      horizons: z.array(horizonSchema).min(1),
      speed_mmPerDay: finite.nullable(),
      strainRate_perDay: finite.nullable(),
      tCrit_h: finite.nonnegative().nullable(),
    }),
  ),
  zones: z.array(
    z.object({
      zoneKey: z.string(),
      tCrit_h: finite.nonnegative().nullable(),
      confidence: finite.min(0).max(1),
    }),
  ),
});
