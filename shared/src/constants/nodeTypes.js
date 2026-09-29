export const NODE_TYPES = Object.freeze([
  'sensor',
  'sensor_rod',
  'relay',
  'root',
  'reference',
  'reference_rtk',
]);

export const NODE_TYPE_LABELS = Object.freeze({
  sensor: 'Sensor',
  sensor_rod: 'Sensor with rod',
  relay: 'Relay',
  root: 'Root relay',
  reference: 'Reference',
  reference_rtk: 'Reference with RTK',
});

export const LINK_KINDS = Object.freeze(['espnow_primary', 'espnow_backup', 'mesh']);

export const EVENT_KINDS = Object.freeze([
  'blast',
  'impact',
  'seating_shift',
  'vehicle_transient',
  'tamper',
]);

export const isRelayType = (type) => type === 'relay' || type === 'root';
export const isReferenceType = (type) => type === 'reference' || type === 'reference_rtk';
export const isGroundSensorType = (type) => type === 'sensor' || type === 'sensor_rod';
/** Anything that measures ground movement (sensors and references). */
export const isMeasuringType = (type) => !isRelayType(type);
