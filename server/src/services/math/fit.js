// Small least-squares and robust fitting helpers.

export function linearFit(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/** y = a + b·x + c·x². Returns null when the system is singular. */
export function quadraticFit(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const s = [0, 0, 0, 0, 0];
  const t = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    const x = xs[i];
    let p = 1;
    for (let k = 0; k < 5; k += 1) {
      s[k] += p;
      if (k < 3) t[k] += p * ys[i];
      p *= x;
    }
  }
  const m = [
    [s[0], s[1], s[2], t[0]],
    [s[1], s[2], s[3], t[1]],
    [s[2], s[3], s[4], t[2]],
  ];
  for (let col = 0; col < 3; col += 1) {
    let piv = col;
    for (let r = col + 1; r < 3; r += 1) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    if (Math.abs(m[piv][col]) < 1e-12) return null;
    [m[col], m[piv]] = [m[piv], m[col]];
    for (let r = 0; r < 3; r += 1) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let k = col; k < 4; k += 1) m[r][k] -= f * m[col][k];
    }
  }
  return { a: m[0][3] / m[0][0], b: m[1][3] / m[1][1], c: m[2][3] / m[2][2] };
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Theil–Sen estimator: median of pairwise slopes. Robust to outliers. */
export function theilSen(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const slopes = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
    }
  }
  if (!slopes.length) return null;
  const slope = median(slopes);
  const intercept = median(xs.map((x, i) => ys[i] - slope * x));
  return { slope, intercept };
}

export { median };
