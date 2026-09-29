import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DUMMY_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../data/dummy',
);

export const dummyPath = (name) => path.join(DUMMY_DIR, name);

export function readJson(name) {
  return JSON.parse(fs.readFileSync(dummyPath(name), 'utf8'));
}

export function writeJson(name, data) {
  fs.writeFileSync(dummyPath(name), `${JSON.stringify(data, null, 2)}\n`);
}

/** Streams readings.ndjson line by line. */
export async function* readNdjson(name) {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: fs.createReadStream(dummyPath(name)), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line);
}
