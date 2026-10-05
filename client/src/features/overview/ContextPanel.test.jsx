import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keys, SITE_ID } from '../../services/queries.js';
import { useSelectionStore } from '../../store/selectionStore.js';
import { useTimeStore } from '../../store/timeStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { ContextPanel } from './ContextPanel.jsx';

// No network in unit tests: anything not already in the cache stays loading.
vi.mock('../../services/api.js', () => ({
  api: { get: () => new Promise(() => {}), post: () => new Promise(() => {}) },
  errorMessage: (e) => String(e),
}));

// jsdom has no canvas: uPlot is replaced by a stub that records nothing.
vi.mock('uplot', () => {
  function UPlot() {
    return { setSize() {}, setData() {}, destroy() {} };
  }
  UPlot.tzDate = (d) => d;
  return { default: UPlot };
});

const zone = {
  zoneKey: 'Z-OW1',
  nodeIds: ['N-037', 'N-038'],
  hull: [
    [240, 170],
    [260, 170],
    [250, 195],
  ],
  centroid: [250, 185],
  area_m2: 800,
  peakSinking_mm: 51,
  peakExcess_mm: 51,
  maxSpeed_mmPerDay: 41,
  worstNodeId: 'N-037',
  accelerating: true,
  knotheExpected_mm: 0,
  tCrit: { model_h: 24.2, inverseVelocity_h: 37, used_h: 24.2, method: 'model' },
  severity: {
    score: 67.9,
    tier: 'warning',
    parts: { sinking: 12.8, speed: 14.6, accel: 20, extent: 4, deviation: 15, proximity: 5 },
    overrides: [],
  },
  inverseVelocity: {
    points: [
      [-2, 0.03],
      [-1, 0.028],
    ],
    slope: -0.002,
    intercept: 0.026,
  },
};
const node = (id, extra = {}) => ({
  id,
  type: 'sensor',
  x: 250,
  y: 185,
  status: 'online',
  lastSeenAt: '2026-10-01T00:00:00Z',
  battery: { pct: 84, mV: 4010 },
  rssi_dBm: -75,
  parentRelayId: 'R-08',
  backupRelayId: 'R-07',
  latest: {
    sinking_mm: 47.4,
    speed_mmPerDay: 39.5,
    tiltX_urad: -1490,
    tiltY_urad: 380,
    temp_C: 25.9,
  },
  zoneKey: 'Z-OW1',
  tier: 'warning',
  ...extra,
});

function renderPanel() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: () => new Promise(() => {}) } },
  });
  qc.setQueryData(keys.zones(SITE_ID), [zone]);
  qc.setQueryData(keys.nodes(SITE_ID), [
    node('N-037'),
    node('N-038', { status: 'silent_after_rise' }),
  ]);
  qc.setQueryData(keys.status(SITE_ID), { rootId: 'R-01', model: { reachable: true } });
  qc.setQueryData(keys.node('N-037'), { ...node('N-037'), meshPath: ['N-037', 'R-08', 'R-01'] });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ContextPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('right panel states', () => {
  beforeEach(() => {
    useTimeStore.setState({ at: null });
    useUiStore.setState({ view: 'oblique' });
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  });
  afterEach(() => useSelectionStore.setState({ selected: null }));

  it('shows the site summary when nothing is selected', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Site summary' })).toBeInTheDocument();
    expect(screen.getByText('Highest risk')).toBeInTheDocument();
    expect(screen.getByText('Z-OW1')).toBeInTheDocument();
    expect(screen.getByText('limit in 24 h')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('shows the zone forecast, both time-to-limit estimates and why the tier was set', () => {
    useSelectionStore.setState({ selected: { kind: 'zone', id: 'Z-OW1' } });
    renderPanel();
    expect(screen.getAllByText(/2 nodes · 800 m² · accelerating/)[0]).toBeInTheDocument();
    expect(screen.getByText(/Model ← used for alerts/)).toBeInTheDocument();
    expect(screen.getByText('Score 67.9 of 100')).toBeInTheDocument();
    expect(screen.getByText('Speeding up')).toBeInTheDocument();
    expect(screen.getByText(/1\/speed falls in a straight line/)).toBeInTheDocument();
  });

  it('shows node values, path to root and history for a selected node', () => {
    useSelectionStore.setState({ selected: { kind: 'node', id: 'N-037' } });
    renderPanel();
    expect(screen.getByRole('heading', { name: 'N-037' })).toBeInTheDocument();
    expect(screen.getByText('Sinking')).toBeInTheDocument();
    expect(screen.getByText('R-08', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('says when the view is not live', () => {
    useTimeStore.setState({ at: Date.UTC(2026, 9, 3, 6, 10) });
    renderPanel();
    expect(screen.getByText('Viewing 3 Oct 11:40 — not live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to live' })).toBeInTheDocument();
  });
});
