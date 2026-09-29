import { UNITS, mmPerMToDeg, uradToMmPerM } from '@subsidence/shared';

const THIN_SPACE = ' ';

/** Fixed decimals that suit the size of the value (42.0 mm, 0.62 mm, 612 mm). */
export function formatNumber(v, decimals) {
  if (v == null || Number.isNaN(v)) return '—';
  if (decimals != null) return Number(v).toFixed(decimals);
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

/** Value and unit, for places that need one string (tooltips, CSV names, aria labels). */
export function withUnit(v, unit, decimals) {
  return v == null ? '—' : `${formatNumber(v, decimals)}${THIN_SPACE}${unit}`;
}

/** Tilt stored in µrad, shown in mm/m or degrees depending on the setting. */
export function tiltValue(urad, mode = 'mmPerM') {
  const mmPerM = uradToMmPerM(urad);
  if (mmPerM == null) return { value: null, unit: UNITS.tilt };
  if (mode === 'deg') return { value: mmPerMToDeg(mmPerM), unit: UNITS.tiltDeg, decimals: 3 };
  return { value: mmPerM, unit: UNITS.tilt, decimals: 2 };
}

export const volts = (mV) => (mV == null ? null : mV / 1000);

export { UNITS };
