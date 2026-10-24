// Starts a disposable MongoDB replica set, then the Next dev server pointed at it,
// so e2e runs never touch the Atlas database in .env.
import { spawn, execSync } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import fs from 'node:fs';

const port = process.env.E2E_PORT ?? '3100';

// Kill any stale process on the port before launching
try {
  if (process.platform !== 'win32') {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`);
  }
} catch {}

const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
fs.writeFileSync('.e2e-mongo-uri', mongo.getUri());

const isWin = process.platform === 'win32';
const server = spawn(
  process.execPath,
  ['./node_modules/next/dist/bin/next', 'dev', '-p', port],
  {
    shell: isWin,
    stdio: 'inherit',
    env: {
      ...process.env,
      MONGODB_URI: mongo.getUri(),
      JWT_SECRET: 'e2e-secret-key',
      PUBLIC_ORIGINS: `http://localhost:${port}`,
      CRON_SECRET: process.env.CRON_SECRET ?? 'test-cron-secret-2026',
    },
  }
);

let isShuttingDown = false;
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    fs.unlinkSync('.e2e-mongo-uri');
  } catch {}
  try {
    server.kill('SIGTERM');
  } catch {}
  try {
    if (process.platform !== 'win32') {
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`);
    }
  } catch {}
  try {
    await mongo.stop({ doCleanup: true, force: true });
  } catch {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', shutdown);

