// Makes sure a MongoDB is available for `npm run dev`.
// - If MONGO_URI points at a server that is already reachable (Docker, a local service, Atlas),
//   it says so and exits.
// - Otherwise it downloads a MongoDB server binary once (cached in ~/.cache/mongodb-binaries)
//   and runs it in the foreground with its data in MONGO_LOCAL_DBPATH, so data survives restarts.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, 'server/.env') });

const uri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/subsidence';
const mode = process.env.MONGO_LOCAL ?? 'auto';
const version = process.env.MONGO_LOCAL_VERSION ?? '7.0.14';
const dbPath = path.resolve(root, process.env.MONGO_LOCAL_DBPATH ?? '.data/mongo');

function parseLocal(u) {
  if (u.startsWith('mongodb+srv://')) return null;
  const m = u.match(/^mongodb:\/\/(?:[^@/]+@)?([^:/,]+)(?::(\d+))?/);
  if (!m) return null;
  const host = m[1];
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) return null;
  return { host: host === 'localhost' ? '127.0.0.1' : host, port: Number(m[2] ?? 27017) };
}

function isOpen({ host, port }) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    sock.setTimeout(800);
    sock.once('connect', () => (sock.destroy(), resolve(true)));
    sock.once('timeout', () => (sock.destroy(), resolve(false)));
    sock.once('error', () => resolve(false));
  });
}

async function main() {
  const local = parseLocal(uri);
  if (mode === 'off' || !local) {
    console.log(`Using external MongoDB (${local ? 'MONGO_LOCAL=off' : 'non-local URI'}).`);
    return;
  }
  if (await isOpen(local)) {
    console.log(`MongoDB already running on ${local.host}:${local.port}.`);
    return;
  }

  const { MongoBinary } = await import('mongodb-memory-server-core');
  console.log(`Starting local MongoDB ${version} (first run downloads it)...`);
  const bin = await MongoBinary.getPath({ version });
  fs.mkdirSync(dbPath, { recursive: true });

  const child = spawn(
    bin,
    ['--dbpath', dbPath, '--port', String(local.port), '--bind_ip', local.host, '--quiet'],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  child.on('exit', (code) => {
    console.log(`mongod exited with code ${code}`);
    process.exit(code ?? 0);
  });
  const stop = () => child.kill('SIGINT');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  for (let i = 0; i < 60 && !(await isOpen(local)); i += 1) {
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`Local MongoDB ready on ${local.host}:${local.port}, data in ${dbPath}`);
}

main().catch((err) => {
  console.error('Could not start MongoDB:', err.message);
  process.exit(1);
});
