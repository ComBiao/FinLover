// Starts a disposable MongoDB replica set, then the Next dev server pointed at it,
// so e2e runs never touch the Atlas database in .env.
import { spawn, execSync } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import fs from 'node:fs';

const port = process.env.E2E_PORT ?? '3100';

const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
// The Playwright worker is a separate process, so it reads the URI from this per-port file.
const uriFile = `.e2e-mongo-uri-${port}`;
fs.writeFileSync(uriFile, mongo.getUri());

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
async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    fs.unlinkSync(uriFile);
  } catch {}
  try {
    // shell:true on Windows wraps next in cmd.exe, so kill the whole tree.
    if (isWin) execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
    else server.kill('SIGTERM');
  } catch {}
  try {
    await mongo.stop({ doCleanup: true, force: true });
  } catch {}
  process.exit(code);
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
server.on('exit', (code) => shutdown(code ?? 0));
