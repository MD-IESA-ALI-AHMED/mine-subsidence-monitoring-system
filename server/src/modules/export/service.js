import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { readingCursor } from '../readings/service.js';

export const CSV_COLUMNS = [
  'ts',
  'nodeId',
  'sinking_mm',
  'speed_mmPerDay',
  'accel_mmPerDay2',
  'tiltX_urad',
  'tiltY_urad',
  'rod_mm',
  'temp_C',
  'pressure_Pa',
  'pga_mg',
  'ppv_mmps',
  'battery_mV',
  'solar_mV',
  'rssi_dBm',
  'flags',
];

const ymd = (d) => d.toISOString().slice(0, 10);

/** site-01_N-041_2026-09-26_2026-10-03.csv */
export function exportFilename(siteId, nodeIds, from, to) {
  const who = nodeIds.length === 1 ? nodeIds[0] : `${nodeIds.length}-nodes`;
  return `${siteId}_${who}_${ymd(from)}_${ymd(to)}.csv`;
}

function toRow(r) {
  const flags = Object.entries(r.flags ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join('|');
  const cells = CSV_COLUMNS.map((c) => {
    if (c === 'ts') return r.ts.toISOString();
    if (c === 'nodeId') return r.meta.nodeId;
    if (c === 'flags') return flags;
    return r[c] ?? '';
  });
  return `${cells.join(',')}\n`;
}

/** Streams readings as CSV into a writable (the HTTP response). */
export async function streamReadingsCsv(out, { siteId, nodeIds, from, to }) {
  out.write(`${CSV_COLUMNS.join(',')}\n`);
  const cursor = readingCursor({
    'meta.siteId': siteId,
    'meta.nodeId': { $in: nodeIds },
    ts: { $gte: from, $lte: to },
  });
  const toCsv = new Transform({
    writableObjectMode: true,
    transform(doc, _enc, cb) {
      cb(null, toRow(doc));
    },
  });
  await pipeline(cursor, toCsv, out);
}
