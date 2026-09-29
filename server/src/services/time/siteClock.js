import { SystemStatus } from '../../modules/system/model.js';

// "Now" for a site. With the simulator on, site time runs SIM_SPEED times faster than the wall
// clock, so every relative time (data age, time to limit, ranges) uses this instead of Date.now().

const clocks = new Map();

export function setSiteNow(siteId, date) {
  clocks.set(siteId, new Date(date));
}

export async function getSiteNow(siteId) {
  if (clocks.has(siteId)) return clocks.get(siteId);
  const status = await SystemStatus.findById(siteId, { siteClock: 1, simulated: 1 }).lean();
  const now = status?.simulated && status.siteClock ? new Date(status.siteClock) : new Date();
  if (status?.simulated) clocks.set(siteId, now);
  return now;
}

export function resetSiteClocks() {
  clocks.clear();
}
