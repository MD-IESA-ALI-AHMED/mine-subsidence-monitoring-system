import { beforeEach, describe, expect, it } from 'vitest';
import { useSelectionStore } from './selectionStore.js';
import { snapToStep, useTimeStore } from './timeStore.js';
import { useUiStore } from './uiStore.js';

describe('selection store', () => {
  beforeEach(() => useSelectionStore.setState({ selected: null, focusSeq: 0 }));

  it('selects, focuses and clears', () => {
    useSelectionStore.getState().select('zone', 'Z-OW1');
    expect(useSelectionStore.getState().selected).toEqual({ kind: 'zone', id: 'Z-OW1' });
    expect(useSelectionStore.getState().focusSeq).toBe(1);
    useSelectionStore.getState().select('node', 'N-041', { focus: false });
    expect(useSelectionStore.getState().focusSeq).toBe(1);
    useSelectionStore.getState().clear();
    expect(useSelectionStore.getState().selected).toBeNull();
  });
});

describe('time store', () => {
  it('goes to a past time and back to live', () => {
    useTimeStore.getState().setAt(1000.4);
    expect(useTimeStore.getState().at).toBe(1000);
    useTimeStore.getState().setPlaying(true);
    useTimeStore.getState().goLive();
    expect(useTimeStore.getState()).toMatchObject({ at: null, playing: false });
  });
  it('snaps to 10-minute steps', () => {
    expect(snapToStep(14 * 60000)).toBe(10 * 60000);
    expect(snapToStep(16 * 60000)).toBe(20 * 60000);
  });
});

describe('ui store', () => {
  it('toggles layout and layers', () => {
    const s = useUiStore.getState();
    const before = s.railCollapsed;
    s.toggleRail();
    expect(useUiStore.getState().railCollapsed).toBe(!before);
    s.toggleLayer('backup');
    expect(useUiStore.getState().layers.backup).toBe(true);
    s.setSetting('tiltUnit', 'deg');
    expect(useUiStore.getState().settings.tiltUnit).toBe('deg');
  });
});
