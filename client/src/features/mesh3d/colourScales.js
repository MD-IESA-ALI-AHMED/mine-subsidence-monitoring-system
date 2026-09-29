import { formatHex, interpolate } from 'culori';

// Data colour scales, interpolated in OKLCH. Defined once; the 3D scene, legends and charts all use
// these. No viridis/plasma/turbo/rainbow: they contain purple or mislead.

const STOPS = {
  sinking: {
    dark: ['#24323A', '#5E7C6B', '#C9B458', '#E08A2E', '#C53A2E'],
    light: ['#E7E3D8', '#B9C4A8', '#D6B84C', '#D9782A', '#A5281E'],
  },
  // Rising ground (negative) in muted teal, zero neutral, sinking through ochre to red.
  speed: {
    dark: ['#2F8A82', '#3E5A5A', '#454D52', '#C9B458', '#E08A2E', '#C53A2E'],
    light: ['#2E7F77', '#9DBDB6', '#D9D4C8', '#D6B84C', '#D9782A', '#A5281E'],
  },
  // Battery and signal: neutral (bad) to teal (good).
  good: {
    dark: ['#454D52', '#4E7874', '#3AA99F'],
    light: ['#CFC9BC', '#7FB2AA', '#1F7F76'],
  },
};

export const MESH_LAYER_COLOURS = {
  dark: ['#3AA99F', '#C8B48A', '#5B7A99', '#7A8450'],
  light: ['#1F7F76', '#A08A5A', '#5B7A99', '#6B7545'],
};

const cache = new Map();
function ramp(name, theme) {
  const key = `${name}|${theme}`;
  if (!cache.has(key)) cache.set(key, interpolate(STOPS[name][theme], 'oklch'));
  return cache.get(key);
}
const clamp01 = (t) => Math.max(0, Math.min(1, t));

export const SINKING_DOMAIN = [0.5, 1000]; // mm, log scale
const LOG_MIN = Math.log10(SINKING_DOMAIN[0]);
const LOG_SPAN = Math.log10(SINKING_DOMAIN[1]) - LOG_MIN;

/** 0..1 position of a sinking value on the log scale (values at or below 0.5 mm are 0). */
export const sinkingT = (mm) =>
  mm == null || mm <= SINKING_DOMAIN[0] ? 0 : clamp01((Math.log10(mm) - LOG_MIN) / LOG_SPAN);

const SPEED_MAX = 100; // mm/day, symmetric log
/** 0..1 with 0.5 at zero speed; negative (rising) below 0.5. */
export const speedT = (v) => {
  if (v == null) return 0.5;
  const s = Math.sign(v) * (Math.log10(1 + Math.abs(v)) / Math.log10(1 + SPEED_MAX));
  return clamp01(0.5 + s / 2);
};

export const batteryT = (pct) => (pct == null ? 0 : clamp01(pct / 100));
export const signalT = (dBm) => (dBm == null ? 0 : clamp01((dBm + 100) / 50)); // −100 … −50 dBm

/** Hex colour for a metric value. metric: sinking | speed | battery | signal | meshLayer */
export function colourFor(metric, value, theme = 'dark') {
  switch (metric) {
    case 'sinking':
      return formatHex(ramp('sinking', theme)(sinkingT(value)));
    case 'speed':
      return formatHex(ramp('speed', theme)(speedT(value)));
    case 'battery':
      return formatHex(ramp('good', theme)(batteryT(value)));
    case 'signal':
      return formatHex(ramp('good', theme)(signalT(value)));
    case 'meshLayer': {
      const colours = MESH_LAYER_COLOURS[theme];
      return value == null ? null : colours[(value - 1) % colours.length];
    }
    default:
      return null;
  }
}

/** Evenly spaced colours along a scale, for legends. */
export function scaleSwatches(metric, theme = 'dark', n = 24) {
  const name = metric === 'battery' || metric === 'signal' ? 'good' : metric;
  const f = ramp(name, theme);
  return Array.from({ length: n }, (_, i) => formatHex(f(i / (n - 1))));
}

/** Legend tick labels for each metric, as [position 0..1, label]. */
export const SCALE_TICKS = {
  sinking: [0.5, 5, 50, 500].map((v) => [sinkingT(v), String(v)]),
  speed: [-10, -1, 0, 1, 10, 100].map((v) => [speedT(v), String(v)]),
  battery: [0, 50, 100].map((v) => [batteryT(v), String(v)]),
  signal: [-100, -75, -50].map((v) => [signalT(v), String(v)]),
};

export const METRIC_LABELS = {
  sinking: { label: 'Sinking', unit: 'mm', note: 'log scale' },
  speed: { label: 'Speed', unit: 'mm/day', note: 'rising ← 0 → sinking' },
  battery: { label: 'Battery', unit: '%' },
  signal: { label: 'Signal', unit: 'dBm' },
  meshLayer: { label: 'Mesh layer' },
};

/** Value of the metric for a node DTO. */
export function nodeMetric(node, metric) {
  switch (metric) {
    case 'sinking':
      return node.latest?.sinking_mm ?? null;
    case 'speed':
      return node.latest?.speed_mmPerDay ?? null;
    case 'battery':
      return node.battery?.pct ?? null;
    case 'signal':
      return node.rssi_dBm ?? null;
    case 'meshLayer':
      return node.meshLayer ?? null;
    default:
      return null;
  }
}
