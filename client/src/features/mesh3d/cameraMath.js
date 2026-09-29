// Camera poses and easing, kept free of React so they can be tested.

/** cubic-bezier(0.2, 0, 0, 1) — the app's one easing curve. */
export function ease(t) {
  const x1 = 0.2;
  const y1 = 0;
  const x2 = 0;
  const y2 = 1;
  const bez = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (bez(x1, x2, mid) < t) lo = mid;
    else hi = mid;
  }
  return bez(y1, y2, (lo + hi) / 2);
}

const DEG = Math.PI / 180;

/**
 * Camera position for a view preset around `target`. Scene north is −z; the oblique view looks
 * from the south-south-east, 35° above the horizon.
 */
export function viewPose(view, frame, target = [0, 0, 0], camera = { fov: 35, aspect: 1.2 }) {
  const span = Math.hypot(frame.width, frame.depth);
  // Distance that fits the whole site horizontally and vertically, with a margin.
  const vHalf = ((camera.fov / 2) * Math.PI) / 180;
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const fit = Math.max(frame.width / 2 / Math.tan(hHalf), frame.depth / 2 / Math.tan(vHalf)) * 1.25;
  if (view === 'top') {
    return { position: [target[0], fit, target[2] + 0.01], target };
  }
  const elevation = (view === 'section' ? 28 : 35) * DEG;
  const azimuth = 18 * DEG;
  const dist = Math.max(fit, span * 0.9);
  return {
    position: [
      target[0] + dist * Math.cos(elevation) * Math.sin(azimuth),
      target[1] + dist * Math.sin(elevation),
      target[2] + dist * Math.cos(elevation) * Math.cos(azimuth),
    ],
    target,
  };
}

/** Keeps the camera's current direction but moves it to frame `target` at `distance`. */
export function framePose(camera, controlsTarget, target, distance) {
  const dir = [
    camera.position.x - controlsTarget.x,
    camera.position.y - controlsTarget.y,
    camera.position.z - controlsTarget.z,
  ];
  const len = Math.hypot(...dir) || 1;
  return {
    position: dir.map((d, i) => target[i] + (d / len) * distance),
    target,
  };
}
