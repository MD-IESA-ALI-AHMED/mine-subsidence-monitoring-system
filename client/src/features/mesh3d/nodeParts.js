import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from 'three';

// Node models, built from parts. Each part becomes one InstancedMesh covering every node that has
// it. `metric` parts take the node's colour (by the chosen metric); the others are neutral.
// Sizes are in metres before NODE_SCALE.

export const PARTS = [
  {
    id: 'stake',
    types: ['sensor', 'sensor_rod'],
    geometry: () => new CylinderGeometry(0.12, 0.12, 1, 6),
    y: 0.5,
  },
  {
    id: 'head',
    types: ['sensor', 'sensor_rod'],
    geometry: () => new CylinderGeometry(0.55, 0.55, 0.45, 16),
    y: 1.2,
    metric: true,
  },
  // Light rim around the head so a node stands out from ground of the same colour.
  {
    id: 'headRim',
    types: ['sensor', 'sensor_rod'],
    geometry: () => new TorusGeometry(0.56, 0.07, 6, 24).rotateX(Math.PI / 2),
    y: 1.43,
    tone: 'rim',
  },
  {
    id: 'rodRing',
    types: ['sensor_rod'],
    geometry: () => new TorusGeometry(0.55, 0.08, 6, 20).rotateX(Math.PI / 2),
    y: 0.05,
  },
  {
    id: 'mast',
    types: ['relay', 'root'],
    geometry: () => new CylinderGeometry(0.09, 0.12, 3, 6),
    y: 1.5,
  },
  {
    id: 'relayHead',
    types: ['relay', 'root'],
    geometry: () => new BoxGeometry(0.75, 0.5, 0.75),
    y: 3.1,
    metric: true,
  },
  { id: 'rootBase', types: ['root'], geometry: () => new BoxGeometry(1.7, 0.15, 1.7), y: 0.08 },
  {
    id: 'plate',
    types: ['reference', 'reference_rtk'],
    geometry: () => new BoxGeometry(1.3, 0.22, 1.3),
    y: 0.11,
    metric: true,
  },
  {
    id: 'plateRim',
    types: ['reference', 'reference_rtk'],
    geometry: () => new BoxGeometry(1.42, 0.1, 1.42),
    y: 0.02,
    tone: 'rim',
  },
  {
    id: 'dome',
    types: ['reference_rtk'],
    geometry: () => new SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    y: 0.22,
  },
];

/** Height (before NODE_SCALE) of the top of each node type, for labels and packet paths. */
export const TOP_Y = {
  sensor: 1.5,
  sensor_rod: 1.5,
  relay: 3.4,
  root: 3.4,
  reference: 0.3,
  reference_rtk: 0.6,
};

/** Parts whose instances can be hovered and clicked. */
export const PICKABLE = new Set(['head', 'relayHead', 'plate', 'mast']);

/** Legend key: one line per node type. */
export const NODE_SHAPE_KEY = [
  { type: 'sensor', label: 'Sensor', glyph: 'cylinder on a stake' },
  { type: 'sensor_rod', label: 'Sensor with rod', glyph: 'ring at the base' },
  { type: 'relay', label: 'Relay', glyph: 'mast' },
  { type: 'root', label: 'Root relay', glyph: 'mast on a square base' },
  { type: 'reference', label: 'Reference', glyph: 'square plate' },
  { type: 'reference_rtk', label: 'Reference with RTK', glyph: 'plate with dome' },
];
