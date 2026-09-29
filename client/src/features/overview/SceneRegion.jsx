import { Scene } from '../mesh3d/Scene.jsx';
import { TimeScrubber } from '../timeline/TimeScrubber.jsx';

/** The centre of the Overview: the 3D scene with the time scrubber along its bottom edge. */
export function SceneRegion() {
  return (
    <>
      <Scene />
      <TimeScrubber />
    </>
  );
}
