import { useSite } from '../../services/queries.js';
import { useIntroStore } from './introStore.js';
import { useIntroStages } from './useIntroTimeline.js';
import s from './IntroOverlay.module.css';

/**
 * First moments of the opening animation: the empty background with the site name at lower left
 * and a thin line that tracks real data loading. Fades as the scene takes over.
 */
export function IntroOverlay() {
  const { overlay } = useIntroStages();
  const loading = useIntroStore((st) => st.loading);
  const active = useIntroStore((st) => st.pending);
  const { data: site } = useSite();
  if (!active || overlay <= 0) return null;
  return (
    <div className={s.overlay} style={{ opacity: overlay }} aria-hidden>
      <div className={s.name}>{site?.name ?? 'Site'}</div>
      <div className={s.track}>
        <div className={s.bar} style={{ transform: `scaleX(${Math.max(0.04, loading)})` }} />
      </div>
    </div>
  );
}
