import { randomUUID } from 'node:crypto';

const LEN = 144;

/**
 * A contract-valid request with two nodes: one accelerating toward failure 30 h from now
 * (like scenario C) and one quiet.
 */
export function sampleRequest() {
  const t = Array.from({ length: LEN }, (_, i) =>
    new Date(Date.UTC(2026, 9, 1, 0, i * 10)).toISOString(),
  );
  const hoursAgo = (i) => ((LEN - 1 - i) * 10) / 60;
  const tf = 30;
  const A = 900; // speed = A / (tf + hoursAgo) mm/day
  const accelSinking = t.map(
    (_, i) => (A / 24) * Math.log((tf + hoursAgo(0)) / (tf + hoursAgo(i))),
  );
  const series = (sinking, speed) => ({
    t,
    sinking_mm: sinking,
    speed_mmPerDay: speed,
    accel_mmPerDay2: t.map(() => null),
    tiltX_urad: t.map(() => 10),
    tiltY_urad: t.map(() => -5),
    rod_mm: t.map(() => null),
    temp_C: t.map(() => 30),
    expected_mm: t.map(() => 0),
    event: t.map(() => 0),
    mask: sinking.map((v) => (v == null ? 1 : 0)),
  });
  const node = (nodeId, s) => ({
    nodeId,
    type: 'sensor',
    x: 250,
    y: 185,
    static: {
      distToPanelEdge_m: 5,
      depth_m: 35,
      extractionStatus: 'extracted',
      knotheExpected_mm: 0,
      nearHaulRoad: false,
    },
    series: s,
  });
  return {
    requestId: randomUUID(),
    siteId: 'site-01',
    generatedAt: '2026-10-02T00:00:00+05:30',
    horizonsHours: [1, 6, 24, 72],
    window: { stepMinutes: 10, length: LEN },
    limits: { sinking_mm: 100, speed_mmPerDay: 70, tilt_mmPerM: 3 },
    nodes: [
      node(
        'N-038',
        series(
          accelSinking,
          t.map((_, i) => A / (tf + hoursAgo(i))),
        ),
      ),
      node(
        'N-001',
        series(
          t.map((_, i) => (i % 7 === 0 ? null : 0.1)),
          t.map(() => 0.1),
        ),
      ),
    ],
    zones: [{ zoneKey: 'Z-OW1', nodeIds: ['N-038'] }],
  };
}
