// Plane geometry in local site metres (x east, y north).

export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Ground elevation from the site's analytic surface description. */
export function groundZ(ground, x, y) {
  const { base_m, slopeX, undulation_m, waveX_m, waveY_m } = ground;
  return base_m + slopeX * x + undulation_m * Math.sin(x / waveX_m) * Math.cos(y / waveY_m);
}

export function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return dist(px, py, ax + t * dx, ay + t * dy);
}

export function distToPolyline(px, py, points) {
  let best = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    best = Math.min(best, distToSegment(px, py, points[i - 1], points[i]));
  }
  return best;
}

/** Distance to the polygon boundary (0 on the edge, positive inside and outside). */
export function distToPolygonEdge(px, py, polygon) {
  return distToPolyline(px, py, [...polygon, polygon[0]]);
}

export function polygonArea(polygon) {
  let a = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    a += (polygon[j][0] + polygon[i][0]) * (polygon[j][1] - polygon[i][1]);
  }
  return Math.abs(a / 2);
}

export function centroid(points) {
  const n = points.length || 1;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

/** Andrew's monotone chain. Returns the hull counter-clockwise without repeating the first point. */
export function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Minimum distance between a polygon (hull) and a polyline; 0 if they touch. */
export function distPolygonToPolyline(polygon, line) {
  let best = Infinity;
  for (const [x, y] of polygon) best = Math.min(best, distToPolyline(x, y, line));
  for (const [x, y] of line) {
    if (polygon.length >= 3 && pointInPolygon(x, y, polygon)) return 0;
    best = Math.min(best, polygon.length > 1 ? distToPolygonEdge(x, y, polygon) : Infinity);
  }
  return best;
}
