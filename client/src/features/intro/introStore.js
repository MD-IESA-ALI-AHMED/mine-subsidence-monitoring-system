import { create } from 'zustand';

const KEY = 'introPlayed';

/** Once per browser session. Storage may be blocked: then it plays once per page load. */
export function introAlreadyPlayed() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroPlayed() {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* not persisted */
  }
}

/**
 * Opening animation state. `pending` is known from page load, so the first frame of Overview is
 * already the empty start of the animation (no flash of the finished scene). `t` (seconds) is
 * advanced by the controller; `loading` 0..1 feeds the progress line.
 */
export const useIntroStore = create((set) => ({
  pending: !introAlreadyPlayed(),
  running: false,
  reduced: false,
  t: 0,
  dataReady: false,
  loading: 0,
  start: (reduced) => set({ running: true, reduced, t: 0 }),
  setT: (t) => set({ t }),
  stop: () => set({ running: false, t: 0 }),
  finish: () => set({ pending: false, running: false }),
  setData: (dataReady, loading) => set({ dataReady, loading }),
}));
