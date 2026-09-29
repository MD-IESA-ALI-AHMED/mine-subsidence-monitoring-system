// Compact form for readings.ndjson: null fields and false flags are left out.

const FIELDS = [
  'tiltX_urad',
  'tiltY_urad',
  'tiltSigma_urad',
  'sinking_mm',
  'sinkingSigma_mm',
  'speed_mmPerDay',
  'accel_mmPerDay2',
  'rod_mm',
  'pressure_Pa',
  'temp_C',
  'pga_mg',
  'ppv_mmps',
  'fDom_Hz',
  'battery_mV',
  'solar_mV',
  'rssi_dBm',
];
const FLAGS = [
  'shaken',
  'eventInWindow',
  'lowBattery',
  'rodInvalid',
  'fastMode',
  'resent',
  'masked',
];

export function compactReading(r) {
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    if (k === 'flags' || v == null) continue;
    out[k] = v;
  }
  const on = FLAGS.filter((f) => r.flags?.[f]);
  if (on.length) out.f = on;
  return out;
}

export function expandReading(c) {
  const r = { nodeId: c.nodeId, tOffset_min: c.tOffset_min, seq: c.seq };
  for (const k of FIELDS) r[k] = c[k] ?? null;
  r.flags = Object.fromEntries(FLAGS.map((f) => [f, Boolean(c.f?.includes(f))]));
  return r;
}
