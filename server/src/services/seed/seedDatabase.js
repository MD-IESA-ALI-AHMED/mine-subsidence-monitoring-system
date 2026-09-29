import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { batteryPct } from '@subsidence/shared';
import { readJson, readNdjson } from './dummyFiles.js';
import { User } from '../../modules/auth/model.js';
import { Event } from '../../modules/events/model.js';
import { Link } from '../../modules/links/model.js';
import { Node } from '../../modules/nodes/model.js';
import { Reading } from '../../modules/readings/model.js';
import { Site } from '../../modules/sites/model.js';
import { SystemStatus } from '../../modules/system/model.js';
import { MeshState } from '../../modules/topology/model.js';
import { classifyNode } from '../pipeline/nodeStatus.js';
import { expandReading } from '../simulator/readingCodec.js';
import { addMinutes, istMidnightAtOrBefore } from '../time/siteTime.js';

const BATCH = 5000;
export const BCRYPT_COST = 12;

/**
 * Clears the database and loads the dummy site. The history is shifted by whole days so that
 * it ends at the most recent IST midnight (blasts stay at 13:30 IST, trucks run 06:00-22:00).
 */
export async function seedDatabase({ demoPassword, now = new Date(), log = () => {} }) {
  const cfg = readJson('scenarios.json');
  const siteDoc = readJson('site.json');
  const historyMin = cfg.history.days * 1440;
  const end = istMidnightAtOrBefore(now);
  const start = addMinutes(end, -historyMin);
  const at = (tMin) => addMinutes(start, tMin);

  await mongoose.connection.dropDatabase();
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).createCollection()));
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).syncIndexes()));

  siteDoc.historyStartAt = start;
  siteDoc.simulated = true;
  for (const p of siteDoc.panels) if (p.face) p.face.startAt = at(p.face.startOffset_min);
  await Site.create(siteDoc);

  const siteId = siteDoc._id;
  const lastByNode = new Map();
  const speeds = new Map();
  let batch = [];
  let count = 0;
  for await (const compact of readNdjson('readings.ndjson')) {
    const r = expandReading(compact);
    const { nodeId, tOffset_min: t, ...fields } = r;
    batch.push({ ts: at(t), meta: { siteId, nodeId }, ...fields });
    lastByNode.set(nodeId, r);
    const sp = speeds.get(nodeId) ?? [];
    sp.push({ tMin: t, speed: r.speed_mmPerDay });
    if (sp.length > 36) sp.shift();
    speeds.set(nodeId, sp);
    if (batch.length >= BATCH) {
      await Reading.collection.insertMany(batch, { ordered: false });
      count += batch.length;
      batch = [];
    }
  }
  if (batch.length) await Reading.collection.insertMany(batch, { ordered: false });
  count += batch.length;
  log(`Inserted ${count} readings`);

  const th = siteDoc.thresholds;
  const nodes = readJson('nodes.json').map(({ installedOffset_min, ...n }) => {
    const last = lastByNode.get(n._id);
    const lastSeenAt = last ? at(last.tOffset_min) : null;
    return {
      ...n,
      installedAt: at(installedOffset_min),
      status: classifyNode({
        lastSeenAt,
        now: end,
        intervalMin: cfg.history.stepMinutes,
        recentSpeeds: speeds.get(n._id),
        thresholds: th,
      }),
      lastSeenAt,
      battery: { mV: last?.battery_mV ?? null, pct: batteryPct(last?.battery_mV) },
      rssi_dBm: last?.rssi_dBm ?? null,
      fastMode: false,
      latest: last
        ? {
            sinking_mm: last.sinking_mm,
            speed_mmPerDay: last.speed_mmPerDay,
            accel_mmPerDay2: last.accel_mmPerDay2,
            tiltX_urad: last.tiltX_urad,
            tiltY_urad: last.tiltY_urad,
            temp_C: last.temp_C,
            rod_mm: last.rod_mm,
          }
        : {},
    };
  });
  await Node.insertMany(nodes);

  await Link.insertMany(readJson('links.json'));
  await MeshState.insertMany(
    readJson('meshHistory.json').map(({ tOffset_min, ...m }) => ({
      ...m,
      siteId,
      ts: at(tOffset_min),
    })),
  );
  await Event.insertMany(
    readJson('events.json').map(({ tOffset_min, ...e }) => ({ ...e, siteId, ts: at(tOffset_min) })),
  );
  const seatShift = readJson('events.json').find((e) => e.kind === 'seating_shift');
  if (seatShift) {
    await Node.updateMany(
      { _id: { $in: seatShift.nodeIds } },
      { rebaselinedAt: at(seatShift.tOffset_min) },
    );
  }

  const users = readJson('users.json');
  for (const u of users) {
    await User.create({
      name: u.name,
      email: u.email,
      passwordHash: await bcrypt.hash(demoPassword, BCRYPT_COST),
    });
  }

  const online = nodes.filter((n) => n.status === 'online').length;
  await SystemStatus.create({
    _id: siteId,
    meshOnline: online,
    meshTotal: nodes.length,
    rootId: nodes.find((n) => n.type === 'root')._id,
    degraded: false,
    lastReadingAt: at(Math.max(...[...lastByNode.values()].map((r) => r.tOffset_min))),
    siteClock: end,
    simulated: true,
    model: { mode: process.env.MODEL_MODE ?? 'mock', reachable: true },
    gate: { open: false },
    updatedAt: new Date(),
  });

  log(
    `Seeded ${siteId}: ${nodes.length} nodes, history ${start.toISOString()} -> ${end.toISOString()}`,
  );
  return { siteId, start, end, readings: count, users: users.map((u) => u.email) };
}

/** True when the database has no site yet (fresh clone). */
export async function isEmpty() {
  return (await Site.estimatedDocumentCount()) === 0;
}
