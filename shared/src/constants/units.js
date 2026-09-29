// Display units. Storage units are µrad for tilt, mm for sinking, mV for battery.
export const UNITS = Object.freeze({
  sinking: 'mm',
  speed: 'mm/day',
  accel: 'mm/day²',
  tilt: 'mm/m',
  tiltDeg: '°',
  tCrit: 'h',
  temp: '°C',
  battery: '%',
  voltage: 'V',
  signal: 'dBm',
  area: 'm²',
  distance: 'm',
  pga: 'mg',
  ppv: 'mm/s',
});

export const IST_OFFSET_MIN = 330;
export const SITE_TIMEZONE = 'Asia/Kolkata';

/** 1 mm/m of tilt = 1000 µrad. */
export const uradToMmPerM = (urad) => (urad == null ? null : urad / 1000);
export const mmPerMToUrad = (v) => (v == null ? null : v * 1000);
export const mmPerMToDeg = (v) => (v == null ? null : (Math.atan(v / 1000) * 180) / Math.PI);

/** 18650 cell: roughly linear between 3.0 V (empty) and 4.2 V (full). */
export function batteryPct(mV) {
  if (mV == null) return null;
  const pct = ((mV - 3000) / (4200 - 3000)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
