import { create } from 'zustand';

/** The section line drawn in the Section view, in site metres: { a: [x, y], b: [x, y] } or null. */
export const useSectionStore = create((set) => ({
  line: null,
  setLine: (line) => set({ line }),
  clear: () => set({ line: null }),
}));
