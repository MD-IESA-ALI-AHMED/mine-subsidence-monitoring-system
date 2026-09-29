// Writes the deterministic dummy site into server/data/dummy/ from scenarios.json.
//   npm run generate:data
import fs from 'node:fs';
import { buildContext } from '../src/services/simulator/context.js';
import { buildLinks, buildNodes } from '../src/services/simulator/layout.js';
import { compactReading } from '../src/services/simulator/readingCodec.js';
import { readingAt } from '../src/services/simulator/scenario.js';
import { eventsBetween } from '../src/services/simulator/scenarioEvents.js';
import { buildSiteDoc } from '../src/services/simulator/siteDoc.js';
import { dummyPath, readJson, writeJson } from '../src/services/seed/dummyFiles.js';
import { runChecks } from './lib/scenarioChecks.js';

const started = Date.now();
const cfg = readJson('scenarios.json');
const nodes = buildNodes(cfg);
const site = buildSiteDoc(cfg);
const I = cfg.scenarios.I_rootFailure;
const fromT = I.day * 1440 + I.fromHour * 60;
const toT = I.day * 1440 + I.toHour * 60;

const normal = buildLinks(cfg, nodes);
const failed = buildLinks(cfg, nodes, { rootId: I.newRoot, down: new Set([I.failedRoot]) });
const meshHistory = [
  { tOffset_min: 0, rootId: I.failedRoot, degraded: false, reason: null, links: normal.links },
  {
    tOffset_min: fromT,
    rootId: I.newRoot,
    degraded: true,
    reason: `root lost, ${I.newRoot} now root`,
    down: [I.failedRoot],
    links: failed.links,
  },
  {
    tOffset_min: toT,
    rootId: I.failedRoot,
    degraded: false,
    reason: `${I.failedRoot} back as root`,
    links: normal.links,
  },
];

const ctx = buildContext(cfg, nodes);
const total = cfg.history.days * 1440;
const out = fs.createWriteStream(dummyPath('readings.ndjson'));
const readings = [];
for (let t = 0; t < total; t += cfg.history.stepMinutes) {
  for (const node of nodes) {
    const r = readingAt(node, t, ctx);
    if (!r) continue;
    readings.push(r);
    out.write(`${JSON.stringify(compactReading(r))}\n`);
  }
}
await new Promise((resolve) => out.end(resolve));

const events = eventsBetween(ctx, nodes, 0, total);
writeJson('site.json', site);
writeJson('nodes.json', nodes);
writeJson('links.json', normal.links);
writeJson('meshHistory.json', meshHistory);
writeJson('events.json', events);
writeJson('users.json', [
  {
    name: 'Duty Engineer',
    email: 'demo@site01.local',
    password: 'from DEMO_PASSWORD in server/.env',
  },
]);

console.log(`Generated in ${((Date.now() - started) / 1000).toFixed(1)} s`);
const ok = runChecks({ cfg, ctx, nodes, readings, events, meshHistory });
process.exit(ok ? 0 : 1);
