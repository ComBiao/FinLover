/** Disposable MongoDB + actual Next HTTP server. Run after npm run build.
 * Never reads MONGODB_URI from the environment and never seeds a real database.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const root = fileURLToPath(new URL('../../', import.meta.url));
const socket = createServer();
socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
let server;
let connection;
let assertions = 0;
async function api(method, path, cookie, body, expected = 200) {
  const response = await fetch(`${origin}/api/v1${path}`, { method,
    headers: { origin, ...(cookie ? { cookie } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.status, expected, `${method} ${path}: HTTP ${response.status}, expected ${expected}`);
  assertions++;
  return { response, payload: await response.json() };
}
try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: root, stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, NODE_ENV: 'production', MONGODB_URI: mongo.getUri(), JWT_SECRET: randomBytes(32).toString('hex'), PUBLIC_ORIGINS: origin, PREVIEW_ORIGINS: '', VERCEL_ENV: '', BCRYPT_SALT_ROUNDS: '4' },
  });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error('Next server exited before readiness');
    try { const response = await fetch(`${origin}/api/v1/wallets`); if (response.status === 401) { ready = true; break; } } catch { /* starting */ }
    await delay(250);
  }
  assert(ready, 'Next server readiness timed out');
  connection = await mongoose.createConnection(mongo.getUri()).asPromise();
  const people = [];
  for (const name of ['Owner', 'Member', 'Pending', 'Outsider']) {
    const email = `${name.toLowerCase()}@smoke.example`;
    const password = 'SmokePassword1';
    const registered = await api('POST', '/auth/register', null, { name, email, password, confirmPassword: password, dataPrivacyConsent: true }, 201);
    const login = await api('POST', '/auth/login', null, { email, password });
    const cookie = login.response.headers.get('set-cookie')?.split(';')[0];
    assert(cookie, 'login must set session cookie');
    people.push({ id: registered.payload.data.user.id, cookie, email });
  }
  const [owner, member, pending, outsider] = people;
  await api('GET', '/invitations', null, undefined, 401);
  const created = await api('POST', '/wallets', owner.cookie, { name: 'Shared smoke', isShared: true, balance: 99 }, 201);
  const wallet = created.payload.data;
  assert.equal(wallet.balance, 0); assert.equal(wallet.role, 'owner'); assert.equal(wallet.memberCount, 1);
  await api('GET', `/wallets/${wallet.id}`, outsider.cookie, undefined, 403);
  const invitation = (await api('POST', `/wallets/${wallet.id}/invitations`, owner.cookie, { email: member.email }, 201)).payload.data;
  await api('POST', `/wallets/${wallet.id}/invitations`, owner.cookie, { email: member.email }, 409);
  await api('POST', `/wallets/${wallet.id}/invitations`, owner.cookie, { email: 'absent@smoke.example' }, 400);
  assert.equal((await api('GET', '/invitations', member.cookie)).payload.data.total, 1);
  await api('GET', `/wallets/${wallet.id}`, member.cookie, undefined, 403);
  await api('POST', `/invitations/${invitation.id}/accept`, outsider.cookie, undefined, 403);
  await api('POST', `/invitations/${invitation.id}/accept`, member.cookie);
  await api('POST', `/invitations/${invitation.id}/accept`, member.cookie, undefined, 409);
  const pendingInvitation = (await api('POST', `/wallets/${wallet.id}/invitations`, owner.cookie, { email: pending.email }, 201)).payload.data;
  const detail = (await api('GET', `/wallets/${wallet.id}`, member.cookie)).payload.data;
  assert.equal(detail.role, 'contributor'); assert.equal(detail.memberCount, 2);
  const cards = (await api('GET', '/wallets', member.cookie)).payload.data;
  assert(cards.some(card => card.id === wallet.id));
  await api('POST', `/wallets/${wallet.id}/invitations`, member.cookie, { email: outsider.email }, 403);
  await api('PUT', `/wallets/${wallet.id}`, member.cookie, { name: 'Denied' }, 403);
  await api('DELETE', `/wallets/${wallet.id}`, member.cookie, undefined, 403);
  await api('DELETE', '/auth/delete-account', owner.cookie, undefined, 409);
  await api('POST', '/transactions', member.cookie, { walletId: wallet.id, type: 'expense', amount: 1, date: '2026-10-23', title: 'Rollout guard' }, 409);
  await api('POST', `/invitations/${pendingInvitation.id}/decline`, pending.cookie);
  await api('POST', `/invitations/${pendingInvitation.id}/decline`, pending.cookie, undefined, 404);
  const personal = (await api('GET', '/wallets', owner.cookie)).payload.data.find(card => !card.isShared);
  await api('POST', '/transactions', owner.cookie, { walletId: personal.id, type: 'income', amount: 5, date: '2026-10-23', title: 'Personal regression' }, 201);
  assert.equal((await api('GET', '/home/summary?walletId=all&month=2026-10', owner.cookie)).payload.data.income, 5);
  await api('DELETE', `/wallets/${wallet.id}`, owner.cookie);
  await api('GET', `/wallets/${wallet.id}`, member.cookie, undefined, 404);
  assert.equal(await connection.collection('walletmembers').countDocuments({ walletId: new mongoose.Types.ObjectId(wallet.id) }), 0);
  console.log(`PASS: ${assertions} HTTP status assertions, four roles, persisted membership cleanup, personal transaction regression; disposable MongoDB only.`);
} finally {
  if (server && server.exitCode === null) {
    const stopped = once(server, 'exit'); server.kill('SIGTERM');
    await Promise.race([stopped, delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) { server.kill('SIGKILL'); await stopped; }
  }
  await connection?.close();
  await mongo.stop();
}
