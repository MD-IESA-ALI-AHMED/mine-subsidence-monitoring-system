import { uradToMmPerM, mmPerMToDeg } from '@subsidence/shared';

const HOUR_S = 3600;
const EVENT_LABELS = {
  blast: 'Blast',
  seating_shift: 'Seating shift',
  impact: 'Impact',
  tamper: 'Possible tamper',
  vehicle_transient: 'Haul truck',
};

/**
 * Aligned arrays for the node charts (uPlot wants one shared x). Readings come first; the latest
 * forecast adds points after "now" (horizons up to `maxHorizonH`) that only the band series use.
 * series: { t: [ms], values: { sinking_mm, tiltX_urad, tiltY_urad, temp_C } }
 * forecast: { createdAt, current_mm, horizons: [{ h, p10_mm, p50_mm, p90_mm }] } or null
 */
export function buildNodeChartData(
  series,
  forecast,
  events = [],
  { tiltUnit = 'mmPerM', maxHorizonH = 24 } = {},
) {
  const v = series?.values ?? {};
  const rows = new Map();
  const row = (t) => {
    if (!rows.has(t))
      rows.set(t, {
        t,
        sinking: null,
        p10: null,
        p50: null,
        p90: null,
        tiltX: null,
        tiltY: null,
        temp: null,
      });
    return rows.get(t);
  };
  const tilt = (urad) => {
    const mm = uradToMmPerM(urad);
    return tiltUnit === 'deg' ? mmPerMToDeg(mm) : mm;
  };

  (series?.t ?? []).forEach((ms, i) => {
    const r = row(Math.round(ms / 1000));
    r.sinking = v.sinking_mm?.[i] ?? null;
    r.tiltX = v.tiltX_urad?.[i] == null ? null : tilt(v.tiltX_urad[i]);
    r.tiltY = v.tiltY_urad?.[i] == null ? null : tilt(v.tiltY_urad[i]);
    r.temp = v.temp_C?.[i] ?? null;
  });

  if (forecast?.horizons?.length && forecast.current_mm != null) {
    const t0 = Math.round(new Date(forecast.createdAt).getTime() / 1000);
    const start = row(t0);
    start.p10 = forecast.current_mm;
    start.p50 = forecast.current_mm;
    start.p90 = forecast.current_mm;
    for (const h of forecast.horizons.filter((x) => x.h <= maxHorizonH)) {
      const r = row(t0 + h.h * HOUR_S);
      r.p10 = h.p10_mm;
      r.p50 = h.p50_mm;
      r.p90 = h.p90_mm;
    }
  }

  const sorted = [...rows.values()].sort((a, b) => a.t - b.t);
  const col = (k) => sorted.map((r) => r[k]);
  return {
    x: col('t'),
    sinking: col('sinking'),
    p10: col('p10'),
    p50: col('p50'),
    p90: col('p90'),
    tiltX: col('tiltX'),
    tiltY: col('tiltY'),
    temp: col('temp'),
    events: events
      .filter((e) => e.kind !== 'vehicle_transient')
      .map((e) => ({
        t: Math.round(new Date(e.ts).getTime() / 1000),
        label: EVENT_LABELS[e.kind] ?? e.kind,
      })),
  };
}
