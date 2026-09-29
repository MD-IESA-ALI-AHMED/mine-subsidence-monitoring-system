import { create } from 'zustand';

export const PLAY_SPEEDS_H = [1, 6, 24]; // site hours per real second

/**
 * What moment the dashboard shows. `at` null means live; otherwise a past time (ms) picked on the
 * time scrubber, and every view fetches its data "as of" that time.
 */
export const useTimeStore = create((set) => ({
  at: null,
  playing: false,
  playSpeedH: 1,
  setAt: (at) => set({ at: at == null ? null : Math.round(at) }),
  goLive: () => set({ at: null, playing: false }),
  setPlaying: (playing) => set({ playing }),
  setPlaySpeed: (playSpeedH) => set({ playSpeedH }),
}));

/** Round a scrubber time to 10 minutes so views share cached responses. */
export const snapToStep = (ms, stepMin = 10) =>
  Math.round(ms / (stepMin * 60000)) * stepMin * 60000;
