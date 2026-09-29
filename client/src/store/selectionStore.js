import { create } from 'zustand';

/**
 * Shared selection: selecting a node or zone anywhere (rail, 3D, alert, table) selects it
 * everywhere. `focusSeq` increments when the camera should frame the selection.
 */
export const useSelectionStore = create((set) => ({
  selected: null, // { kind: 'node' | 'zone', id }
  hovered: null,
  focusSeq: 0,
  select: (kind, id, { focus = true } = {}) =>
    set((s) => ({ selected: { kind, id }, focusSeq: focus ? s.focusSeq + 1 : s.focusSeq })),
  clear: () => set({ selected: null }),
  hover: (kind, id) => set({ hovered: kind ? { kind, id } : null }),
  focus: () => set((s) => ({ focusSeq: s.focusSeq + 1 })),
}));

export const isSelected = (sel, kind, id) => sel?.kind === kind && sel?.id === id;
