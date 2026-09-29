import { Html } from '@react-three/drei';
import s from './Scene.module.css';

/** Small HTML label anchored to a scene point (used sparingly: never for all 60 nodes). */
export function SceneLabel({ position, children, tone = 'default', offsetY = 0 }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className={`${s.label} ${s[tone] ?? ''}`}
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {children}
      </div>
    </Html>
  );
}
