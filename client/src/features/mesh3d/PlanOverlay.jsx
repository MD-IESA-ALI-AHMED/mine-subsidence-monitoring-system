import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import s from './Scene.module.css';

const BAR_M = 50;

/** Inside the canvas: keeps the DOM scale bar at 50 m for the current camera distance. */
export function ScaleProbe({ barRef }) {
  const { camera, size, controls } = useThree();
  const last = useRef(0);
  useFrame(() => {
    if (!barRef.current || !controls) return;
    const dist = camera.position.distanceTo(controls.target);
    const px = (BAR_M / (2 * dist * Math.tan((camera.fov * Math.PI) / 360))) * size.height;
    if (Math.abs(px - last.current) > 0.5) {
      last.current = px;
      barRef.current.style.width = `${px.toFixed(1)}px`;
    }
  });
  return null;
}

/** Top view only: north arrow and a 50 m scale bar. */
export function PlanOverlay({ barRef }) {
  return (
    <div className={`${s.overlay} ${s.bottomRight}`} aria-label="North arrow and scale">
      <svg width="20" height="30" viewBox="0 0 20 30" aria-label="North is up" role="img">
        <path d="M10 2 L16 18 L10 14 L4 18 Z" fill="var(--text)" />
        <text
          x="10"
          y="29"
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-muted)"
          fontFamily="var(--font-mono)"
        >
          N
        </text>
      </svg>
      <div className={s.scaleBarWrap}>
        <div ref={barRef} className={s.scaleBar} />
        <span className="mono">{BAR_M} m</span>
      </div>
    </div>
  );
}
