import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { seedUser } from '@/test/user-fixture';
import { signToken } from '@/server/shared/auth/crypto';
import Wallet from '@/server/db/models/Wallet';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import Scheduler from '@/server/db/models/Scheduler';
import User from '@/server/db/models/User';
import { schedulerResponse } from '@/shared/contracts/schedulers';
vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));
import { v1 } from '@/server/shared/http/versioned-handlers';
import { GET as cron } from '@/app/api/internal/cron/schedulers/route';

const user = new mongoose.Types.ObjectId().toString();
const other = new mongoose.Types.ObjectId().toString();
const auth = (id: string) => ({ authorization: `Bearer ${signToken({ userId: id })}` });
let mongo: MongoMemoryReplSet;
let walletId: string;
const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10); // Bangkok date
const body = () => ({ walletId, type: 'expense', amount: 99, title: 'YouTube Premium', startDate: '2099-01-01', frequency: 'monthly', interval: 1, end: { type: 'never' } });
const call = (method: string, path: string, payload?: unknown, headers: Record<string, string> = auth(user)) =>
  new NextRequest(`http://localhost:3000${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: payload === undefined ? undefined : JSON.stringify(payload) });
const ctx = (id = '') => ({ params: Promise.resolve({ id }) });

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Wallet.init(), Category.init(), Transaction.init(), Scheduler.init(), User.init()]);
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  vi.stubEnv('PUBLIC_ORIGINS', 'http://localhost:3000');
  vi.stubEnv('CRON_SECRET', 'cron-secret');
  await Promise.all([Wallet.deleteMany({}), Category.deleteMany({}), Transaction.collection.deleteMany({}), Scheduler.collection.deleteMany({}), User.deleteMany({})]);
  await Promise.all([seedUser(user), seedUser(other)]);
  walletId = String((await Wallet.create({ userId: user, name: 'Main' }))._id);
  await Category.create({ userId: user, name: 'Others', type: 'expense', isSystem: true });
});

describe('/api/v1/schedulers', () => {
  it('creates, reads, lists, pauses, resumes and deletes with the documented shape', async () => {
    const created = await v1.createScheduler(call('POST', '/api/v1/schedulers', body()), ctx());
    expect(created.status).toBe(201);
    const { data } = await created.json();
    expect(schedulerResponse.parse(data)).toMatchObject({ status: 'active', nextDueDate: '2099-01-01', canManage: true, createdCount: 0 });
    expect(data).not.toHaveProperty('userId');

    const listed = await (await v1.listSchedulers(call('GET', '/api/v1/schedulers?status=active'), ctx())).json();
    expect(listed.data).toHaveLength(1);
    expect((await v1.getScheduler(call('GET', `/api/v1/schedulers/${data.id}`), ctx(data.id))).status).toBe(200);

    const paused = await (await v1.setSchedulerStatus(call('PATCH', `/api/v1/schedulers/${data.id}/status`, { action: 'pause' }), ctx(data.id))).json();
    expect(paused.data.status).toBe('paused');
    const resumed = await (await v1.setSchedulerStatus(call('PATCH', `/api/v1/schedulers/${data.id}/status`, { action: 'resume' }), ctx(data.id))).json();
    expect(resumed.data).toMatchObject({ status: 'active', nextDueDate: '2099-01-01' });

    const updated = await (await v1.updateScheduler(call('PUT', `/api/v1/schedulers/${data.id}`, { ...body(), amount: 120 }), ctx(data.id))).json();
    expect(updated.data.amount).toBe(120);
    expect((await v1.deleteScheduler(call('DELETE', `/api/v1/schedulers/${data.id}`), ctx(data.id))).status).toBe(200);
    expect((await v1.getScheduler(call('GET', `/api/v1/schedulers/${data.id}`), ctx(data.id))).status).toBe(404);
  });

  it('rejects invalid input, a bad status action and anonymous calls', async () => {
    const invalid = await v1.createScheduler(call('POST', '/api/v1/schedulers', { ...body(), interval: 61 }), ctx());
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toMatchObject({ code: 'VALIDATION_ERROR', fields: { interval: expect.any(String) } });
    const created = await (await v1.createScheduler(call('POST', '/api/v1/schedulers', body()), ctx())).json();
    expect((await v1.setSchedulerStatus(call('PATCH', `/x/${created.data.id}/status`, { action: 'cancel' }), ctx(created.data.id))).status).toBe(400);
    expect((await v1.listSchedulers(call('GET', '/api/v1/schedulers', undefined, {}), ctx())).status).toBe(401);
  });

  it('never exposes or changes another user\'s Scheduler', async () => {
    const created = await (await v1.createScheduler(call('POST', '/api/v1/schedulers', body()), ctx())).json();
    const id = created.data.id;
    const theirs = auth(other);
    expect((await (await v1.listSchedulers(call('GET', '/api/v1/schedulers', undefined, theirs), ctx())).json()).data).toEqual([]);
    expect((await v1.getScheduler(call('GET', `/x/${id}`, undefined, theirs), ctx(id))).status).toBe(404);
    expect((await v1.setSchedulerStatus(call('PATCH', `/x/${id}/status`, { action: 'pause' }, theirs), ctx(id))).status).toBe(404);
    expect((await v1.deleteScheduler(call('DELETE', `/x/${id}`, undefined, theirs), ctx(id))).status).toBe(404);
    expect((await v1.createScheduler(call('POST', '/api/v1/schedulers', body(), theirs), ctx())).status).toBe(404); // not their wallet
  });
});

describe('daily cron route', () => {
  const run = (headers: Record<string, string>) => cron(call('GET', '/api/internal/cron/schedulers', undefined, headers));
  it('requires the exact bearer secret and fails closed without one', async () => {
    expect((await run({})).status).toBe(401);
    expect((await run({ authorization: 'Bearer wrong' })).status).toBe(401);
    expect((await run(auth(user))).status).toBe(401);
    vi.stubEnv('CRON_SECRET', '');
    expect((await run({ authorization: 'Bearer ' })).status).toBe(401);
  });
  it('posts due Schedulers and returns a summary', async () => {
    await v1.createScheduler(call('POST', '/api/v1/schedulers', { ...body(), startDate: today }), ctx()); // posts the first one on creation
    await Scheduler.collection.updateMany({}, { $set: { nextDueDate: new Date(`${today}T00:00:00.000Z`) } });
    const response = await run({ authorization: 'Bearer cron-secret' });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ posted: 1, failed: 0 });
    expect(await Transaction.countDocuments()).toBe(2);
  });
});
