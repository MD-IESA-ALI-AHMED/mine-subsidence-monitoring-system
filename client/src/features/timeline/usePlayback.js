import { useEffect } from 'react';
import { useTimeStore } from '../../store/timeStore.js';

const TICK_MS = 250; // 4 updates a second: smooth enough, and each step reuses cached queries
const STEP_MS = 10 * 60_000;

/**
 * Playback and keyboard for the time scrubber. Space plays or pauses, "," and "." step one
 * reading (10 min). Playback advances `at` at playSpeedH site-hours per real second and returns to
 * live when it reaches the present.
 */
export function usePlayback({ start, end }) {
  const playing = useTimeStore((st) => st.playing);
  const speed = useTimeStore((st) => st.playSpeedH);

  useEffect(() => {
    if (!playing || !end) return undefined;
    const timer = setInterval(() => {
      const { at, setAt, goLive } = useTimeStore.getState();
      const from = at ?? start;
      const next = Math.round((from + speed * 3_600_000 * (TICK_MS / 1000)) / STEP_MS) * STEP_MS;
      if (next >= end) goLive();
      else setAt(next);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, speed, start, end]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, button, [contenteditable]')) return;
      const st = useTimeStore.getState();
      if (e.key === ' ') {
        e.preventDefault();
        st.setPlaying(!st.playing);
      } else if (e.key === ',' || e.key === '.') {
        const base = st.at ?? end;
        const next = Math.max(start, Math.min(end, base + (e.key === '.' ? STEP_MS : -STEP_MS)));
        if (next >= end) st.goLive();
        else st.setAt(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start, end]);
}
