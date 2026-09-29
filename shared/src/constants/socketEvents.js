export const SOCKET_EVENTS = Object.freeze({
  READINGS_BATCH: 'readings:batch',
  NODE_STATUS: 'node:status',
  MESH_TOPOLOGY: 'mesh:topology',
  EVENT_NEW: 'event:new',
  GATE_CHANGED: 'gate:changed',
  ZONES_UPDATED: 'zones:updated',
  PREDICTION_NEW: 'prediction:new',
  ALERT_NEW: 'alert:new',
  ALERT_UPDATED: 'alert:updated',
  SYSTEM_STATUS: 'system:status',
  // client -> server
  JOIN_SITE: 'site:join',
  // server -> client, sent just before the access token expires
  AUTH_EXPIRING: 'auth:expiring',
});

export const siteRoom = (siteId) => `site:${siteId}`;
