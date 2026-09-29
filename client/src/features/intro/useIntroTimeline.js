import { useEffect, useMemo } from 'react';
import { useReducedMotion } from '../../hooks/useMediaQuery.js';
import { FINISHED, INTRO_S, REDUCED_S, advance, stagesAt } from './introTimeline.js';
import { markIntroPlayed, useIntroStore } from './introStore.js';

/**
 * Plays the opening animation once per browser session, driving its clock with
 * requestAnimationFrame. A click or Escape skips to the end. Call once, on the Overview page.
 */
export function useIntroController() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!useIntroStore.getState().pending) return undefined;
    useIntroStore.getState().start(reduced);
    const end = reduced ? REDUCED_S : INTRO_S;
    let raf = 0;
    let last = performance.now();

    const detach = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', finish, true);
      window.removeEventListener('keydown', onKey, true);
    };
    function finish() {
      detach();
      useIntroStore.getState().finish();
      markIntroPlayed();
    }
    function onKey(e) {
      if (e.key === 'Escape') finish();
    }
    const frame = () => {
      const now = performance.now(); // same clock as `last`
      const st = useIntroStore.getState();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = advance(st.t, dt, st.dataReady);
      st.setT(t);
      if (t >= end) finish();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener('pointerdown', finish, true);
    window.addEventListener('keydown', onKey, true);
    // Leaving mid-way (or React's development double mount) stops without marking it played.
    return () => {
      detach();
      if (useIntroStore.getState().pending) useIntroStore.getState().stop();
    };
    // `reduced` is read once, at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Stage values for the scene: everything fully shown when no intro is pending. */
export function useIntroStages() {
  const pending = useIntroStore((s) => s.pending);
  const t = useIntroStore((s) => s.t);
  const reduced = useIntroStore((s) => s.reduced);
  return useMemo(() => (pending ? stagesAt(t, { reduced }) : FINISHED), [pending, t, reduced]);
}

/** The shell's slide-in value (only on Overview, where the intro plays). */
export function useIntroUi(onOverview) {
  return useIntroStore((s) =>
    s.pending && onOverview ? stagesAt(s.t, { reduced: s.reduced }).ui : 1,
  );
}
