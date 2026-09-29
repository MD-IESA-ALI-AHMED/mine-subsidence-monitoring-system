import { slideIn } from '../intro/slideIn.js';
import { useIntroUi } from '../intro/useIntroTimeline.js';
import { Scene } from '../mesh3d/Scene.jsx';
import { TimeScrubber } from '../timeline/TimeScrubber.jsx';

/** The centre of the Overview: the 3D scene with the time scrubber along its bottom edge. */
export function SceneRegion() {
  const ui = useIntroUi(true);
  return (
    <>
      <Scene />
      <div style={slideIn(ui, 'bottom')}>
        <TimeScrubber />
      </div>
    </>
  );
}
