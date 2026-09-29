import { theilSen } from '../math/fit.js';

/**
 * online | offline | silent_after_rise.
 * Offline after `offlineMissedIntervals` missed reports; silent_after_rise when the node went quiet
 * while its sinking speed was rising (the most dangerous kind of silence).
 * recentSpeeds: [{ tMin, speed }] for the 6 h before the node went quiet.
 */
export function classifyNode({ lastSeenAt, now, intervalMin, recentSpeeds, thresholds }) {
  if (!lastSeenAt) return 'offline';
  const missed = (now.getTime() - new Date(lastSeenAt).getTime()) / (intervalMin * 60_000);
  if (missed <= thresholds.offlineMissedIntervals) return 'online';
  if (isRising(recentSpeeds, thresholds)) return 'silent_after_rise';
  return 'offline';
}

export function isRising(recentSpeeds, thresholds) {
  const pts = (recentSpeeds ?? []).filter((p) => p.speed != null);
  if (pts.length < 6) return false;
  const fit = theilSen(
    pts.map((p) => p.tMin),
    pts.map((p) => p.speed),
  );
  return Boolean(fit && fit.slope > 0 && pts.at(-1).speed >= thresholds.gateOnSpeed_mmPerDay);
}
