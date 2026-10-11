// Starts a disposable MongoDB replica set, then the Next dev server pointed at it,
// so e2e runs never touch the Atlas database in .env.
import { spawn } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const port = process.env.E2E_PORT ?? '3100';
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

const server = spawn('npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MONGODB_URI: mongo.getUri(),
    JWT_SECRET: 'e2e-secret-key',
    PUBLIC_ORIGINS: `http://localhost:${port}`,
  },
});

async function shutdown() {
  server.kill('SIGTERM');
  await mongo.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', shutdown);
