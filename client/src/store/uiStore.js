import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Storage that never throws (private windows, blocked site data). */
const safeStorage = createJSONStorage(() => ({
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* not persisted */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
}));

export const COLOUR_BY = ['sinking', 'speed', 'battery', 'signal', 'meshLayer'];
export const VIEWS = ['top', 'oblique', 'section'];

/** Layout, scene options and display settings. Remembered in this browser. */
export const useUiStore = create(
  persist(
    (set) => ({
      railCollapsed: false,
      panelCollapsed: false,
      colourBy: 'sinking',
      view: 'oblique',
      // ×50 keeps the ~0.7 m longwall trough readable (≈37 m deep) while the tens-of-mm zone over
      // old workings still shows; the brief's ×300 turned the trough into a crater.
      exaggeration: 50,
      layers: {
        links: true,
        backup: false,
        surface: true,
        zones: true,
        labels: false,
        packets: true,
      },
      settings: { tiltUnit: 'mmPerM', hour12: false, criticalSound: false },

      toggleRail: () => set((s) => ({ railCollapsed: !s.railCollapsed })),
      togglePanel: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
      setColourBy: (colourBy) => set({ colourBy }),
      setView: (view) => set({ view }),
      setExaggeration: (exaggeration) => set({ exaggeration }),
      toggleLayer: (name) => set((s) => ({ layers: { ...s.layers, [name]: !s.layers[name] } })),
      setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
    }),
    {
      name: 'ui',
      storage: safeStorage,
      version: 2,
      migrate: (state, version) => (version < 2 ? { ...state, exaggeration: 50 } : state),
    },
  ),
);

export { safeStorage };
