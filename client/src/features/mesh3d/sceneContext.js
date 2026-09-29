import { createContext, useContext } from 'react';

/**
 * Shared scene model: { site, frame, grid, exaggeration, colours, place(x, y, dh) -> [sx, sy, sz],
 * height(x, y), intro } — `place` puts a site point on the sunken surface (plus dh metres).
 */
export const SceneContext = createContext(null);
export const useSceneModel = () => useContext(SceneContext);
