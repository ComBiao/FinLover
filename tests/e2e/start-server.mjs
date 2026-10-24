// Starts a disposable MongoDB replica set, then the Next dev server pointed at it,
// so e2e runs never touch the Atlas database in .env.
import { spawn } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import fs from 'node:fs';

const port = process.env.E2E_PORT ?? '3100';
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
fs.writeFileSync('.e2e-mongo-uri', mongo.getUri());

const isWin = process.platform === 'win32';
const server = spawn(isWin ? 'npx.cmd' : 'npx', ['next', 'dev', '-p', port], {
  shell: isWin,
  stdio: 'inherit',
  env: {
    ...process.env,
    MONGODB_URI: mongo.getUri(),
    JWT_SECRET: 'e2e-secret-key',
    PUBLIC_ORIGINS: `http://localhost:${port}`,
    CRON_SECRET: process.env.CRON_SECRET ?? 'test-cron-secret-2026',
  },
});

async function shutdown() {
  try {
    fs.unlinkSync('.e2e-mongo-uri');
  } catch {}
  server.kill('SIGTERM');
  await mongo.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', shutdown);
