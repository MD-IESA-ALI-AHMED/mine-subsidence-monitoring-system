import { create } from 'zustand';

const MAX_DRIFT_REAL_MS = 60_000;
const MAX_REPORTS = 80;

/**
 * Connection state, the site clock and recent reports (for the 3D data packets).
 * The site clock runs at simSpeed between updates, so "4 min ago" stays right while the
 * simulator drives the site 60× faster than the wall clock.
 */
export const useLiveStore = create((set, get) => ({
  conn: 'connecting', // connecting | connected | reconnecting | offline
  lastMessageWall: null, // wall-clock ms of the last readings batch
  clockBase: null, // site ms
  clockBaseWall: null, // wall ms when clockBase was observed
  simSpeed: 1,
  now: Date.now(), // site ms, updated every second
  reports: [], // [{ nodeId, wall }]

  setConn: (conn) => set({ conn }),

  observeSiteTime: (siteMs, simSpeed) => {
    const s = get();
    if (simSpeed) set({ simSpeed });
    if (s.clockBase == null || siteMs > s.currentSiteMs()) {
      set({ clockBase: siteMs, clockBaseWall: Date.now() });
    }
  },

  currentSiteMs: () => {
    const { clockBase, clockBaseWall, simSpeed } = get();
    if (clockBase == null) return Date.now();
    const drift = Math.min(Date.now() - clockBaseWall, MAX_DRIFT_REAL_MS);
    return clockBase + drift * simSpeed;
  },

  tick: () => set({ now: get().currentSiteMs() }),

  addReports: (nodeIds) => {
    const wall = Date.now();
    const reports = [...get().reports, ...nodeIds.map((nodeId) => ({ nodeId, wall }))].slice(
      -MAX_REPORTS,
    );
    set({ reports, lastMessageWall: wall });
  },
}));

/** Site "now" as a Date, re-rendering once a second. */
export const useSiteNow = () => new Date(useLiveStore((s) => s.now));
