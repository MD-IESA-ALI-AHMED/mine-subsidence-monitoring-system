// Knothe influence-function model of the subsidence trough over an advancing longwall panel.
//
//   s(x, y, t) = Smax · Fy(y) · ∫ g(x − ξ) · (1 − exp(−(t − tξ)/τ)) dξ   over the extracted part
//   g(u) = exp(−π u² / r²) / r,   r = depth / tanβ,   Smax = a · seam thickness
//
// The panel is a rectangle whose face advances along +x at a constant rate. tξ is the time the
// face passed ξ, and τ is the development time constant (the trough lags the face).

const SQRT_PI = Math.sqrt(Math.PI);
const STEP_M = 1;

function erf(x) {
  // Abramowitz and Stegun 7.1.26, |error| < 1.5e-7.
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Derived constants for a longwall panel document (sites.panels[] with face + knothe). */
export function panelModel(panel) {
  if (!panel?.face || !panel.knothe) return null;
  const ys = panel.polygon.map((p) => p[1]);
  return {
    panelId: panel.panelId,
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
    x0: panel.face.start_m,
    xEnd: panel.face.end_m,
    rate: panel.face.rate_mPerDay,
    r: panel.depth_m / panel.knothe.tanBeta,
    sMax: panel.knothe.subsidenceFactor * panel.seamThickness_m * 1000,
    tau: panel.knothe.lagTau_days,
  };
}

/** Face position (m) after `days` of extraction. */
export function faceX(model, days) {
  if (days <= 0) return model.x0;
  return Math.min(model.xEnd, model.x0 + model.rate * days);
}

function fy(model, y) {
  const k = SQRT_PI / model.r;
  return 0.5 * (erf(k * (y - model.yMin)) - erf(k * (y - model.yMax)));
}

function fx(model, x, days) {
  const face = faceX(model, days);
  if (face <= model.x0) return 0;
  const invR2 = Math.PI / (model.r * model.r);
  let sum = 0;
  for (let xi = model.x0 + STEP_M / 2; xi < face; xi += STEP_M) {
    const u = x - xi;
    const g = Math.exp(-u * u * invR2) / model.r;
    const age = days - (xi - model.x0) / model.rate;
    sum += g * (1 - Math.exp(-age / model.tau));
  }
  return sum * STEP_M;
}

/** Expected sinking (mm, positive down) at (x, y) after `days` of extraction. */
export function knotheSinking(model, x, y, days) {
  if (!model || days <= 0) return 0;
  const fY = fy(model, y);
  if (fY < 1e-6) return 0;
  return model.sMax * fY * fx(model, x, days);
}

/** Precomputes Fx for many x and Fy for many y: fast evaluation on a regular grid. */
export function knotheGrid(model, xs, ys, days) {
  const out = new Float32Array(xs.length * ys.length);
  if (!model || days <= 0) return out;
  const fxs = xs.map((x) => fx(model, x, days));
  const fys = ys.map((y) => fy(model, y));
  for (let j = 0; j < ys.length; j += 1) {
    for (let i = 0; i < xs.length; i += 1) out[j * xs.length + i] = model.sMax * fys[j] * fxs[i];
  }
  return out;
}
