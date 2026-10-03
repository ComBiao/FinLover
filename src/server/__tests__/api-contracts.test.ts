import { seedTransaction } from '@/test/transaction-fixture';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { buildSpec } from '@/server/shared/docs/openapi';
import { signToken } from '@/server/shared/auth/crypto';
import Wallet from '@/server/db/models/Wallet';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import User from '@/server/db/models/User';
vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));
const cookieStore = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }));
import { auth, categories, transactions } from '@/server/composition';
import { v1 } from '@/server/shared/http/versioned-handlers';
const ajv = new Ajv({ strict: false }); addFormats(ajv);
const user = new mongoose.Types.ObjectId().toString();
const other = new mongoose.Types.ObjectId().toString();
const token = signToken({ userId: user });
const otherToken = signToken({ userId: other });
let mongo: MongoMemoryReplSet;
let wallet: string;
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Wallet.init(), Category.init(), Transaction.init(), User.init()]);
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('PUBLIC_ORIGINS', 'http://localhost:3000');
  await Promise.all([Wallet.deleteMany({}), Category.deleteMany({}), Transaction.collection.deleteMany({}), User.deleteMany({})]);
  wallet = String((await Wallet.create({ userId: user, name: 'Main' }))._id);
});
function request(method: string, path: string, body?: unknown, headers: Record<string, string> = { authorization: `Bearer ${token}` }) {
  return new NextRequest(`http://localhost:3000${path}`, { method, headers: { 'content-type': 'application/json', ...(path.includes('/auth/') ? { origin: 'http://localhost:3000' } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
}
const context = (id = '') => ({ params: Promise.resolve({ id }) });
async function contract(version: 'legacy' | 'v1', path: string, method: string, response: Response) {
  const spec = buildSpec(version);
  const operation = spec.paths[path]?.[method] as { responses: Record<string, { content?: { 'application/json': { schema: object } } }> };
  const documented = operation.responses[response.status]; expect(documented).toBeDefined();
  if (response.status === 204) { expect(await response.text()).toBe(''); return null; }
  const payload = await response.json();
  const validate = ajv.compile(documented.content!['application/json'].schema);
  expect(validate(payload), JSON.stringify(validate.errors)).toBe(true);
  return payload;
}
describe.each(['legacy', 'v1'] as const)('%s API contracts', version => {
  it('register/login/logout match schemas and cookie behavior', async () => {
    const prefix = version === 'v1' ? '/api/v1' : '/api';
    const register = version === 'v1' ? v1.register : auth.register;
    const login = version === 'v1' ? v1.login : auth.login;
    const body = { email: 'test@example.com', password: 'Password1', confirmPassword: 'Password1', dataPrivacyConsent: true };
    const reg = await register(request('POST', `${prefix}/auth/register`, body, {}), context()); expect(reg.status).toBe(201);
    await contract(version, `${prefix}/auth/register`, 'post', reg);
    const duplicate = await register(request('POST', `${prefix}/auth/register`, body, {}), context()); expect(duplicate.status).toBe(409);
    await contract(version, `${prefix}/auth/register`, 'post', duplicate);
    const res = await login(request('POST', `${prefix}/auth/login`, body, {}), context()); expect(res.status).toBe(200);
    await contract(version, `${prefix}/auth/login`, 'post', res); expect(cookieStore.set).toHaveBeenCalledWith('session_token', expect.any(String), expect.objectContaining({ httpOnly: true, path: '/' }));
    const bad = await login(request('POST', `${prefix}/auth/login`, { ...body, password: 'wrong' }, {}), context()); expect(bad.status).toBe(401);
    await contract(version, `${prefix}/auth/login`, 'post', bad);
    const out = version === 'v1' ? await v1.logout(request('POST', `${prefix}/auth/logout`, undefined, {}), context()) : await auth.logout(request('POST', '/api/auth/logout', undefined, {}));
    await contract(version, `${prefix}/auth/logout`, 'post', out); expect(cookieStore.delete).toHaveBeenCalledWith('session_token');
  });
  it('category and transaction CRUD match schemas and preserve cascade balances', async () => {
    const prefix = version === 'v1' ? '/api/v1' : '/api';
    const catPath = `${prefix}/categories`;
    const txPath = `${prefix}/${version === 'v1' ? 'transactions' : 'transaction'}`;
    const c = version === 'v1' ? { create: v1.createCategory, update: v1.updateCategory, remove: v1.deleteCategory } : categories;
    const t = version === 'v1' ? { create: v1.createTransaction, update: v1.updateTransaction, remove: v1.deleteTransaction } : transactions;
    const cat = await contract(version, catPath, 'post', await c.create(request('POST', catPath, { name: 'Food', type: 'expense' }), context()));
    const id = String(cat.data.id ?? cat.data._id);
    await contract(version, `${catPath}/{id}`, 'put', await c.update(request('PUT', `${catPath}/${id}`, { name: 'Groceries' }), context(id)));
    const body = version === 'v1' ? { walletId: wallet, categoryId: id, type: 'expense', amount: 42, date: '2026-09-01', title: 'Groceries run' } : { wallet_id: wallet, category_id: id, type: 'Expense', amount: 42, date: '2026-09-01', title: 'Groceries run' };
    const createdResponse = await t.create(request('POST', txPath, body), context()); expect(createdResponse.status).toBe(201);
    const tx = await contract(version, txPath, 'post', createdResponse);
    if (version === 'v1') {
      expect(tx.data).toEqual({ id: expect.any(String), walletId: wallet, categoryId: id, type: 'expense', amount: 42, date: '2026-09-01', title: 'Groceries run' });
      expect(tx.data).not.toHaveProperty('wallet_id');
    }
    await contract(version, `${txPath}/{id}`, 'put', await t.update(request('PUT', `${txPath}/${tx.data.id}`, { ...body, amount: 50 }), context(tx.data.id)));
    expect((await Wallet.findById(wallet))!.balance).toBe(-50);
    await contract(version, `${catPath}/{id}`, 'delete', await c.remove(request('DELETE', `${catPath}/${id}`), context(id)));
    expect((await Transaction.findById(tx.data.id))!.categoryId).toBeNull(); expect((await Wallet.findById(wallet))!.balance).toBe(-50);
    const removed = await t.remove(request('DELETE', `${txPath}/${tx.data.id}`), context(tx.data.id)); expect(removed.status).toBe(version === 'v1' ? 200 : 204);
    await contract(version, `${txPath}/{id}`, 'delete', removed); expect((await Wallet.findById(wallet))!.balance).toBe(0);
  });
  it('covers transaction invalid body, ID, JSON, token, and ownership responses', async () => {
    const base = version === 'v1' ? '/api/v1/transactions' : '/api/transaction';
    const t = version === 'v1' ? { create: v1.createTransaction, update: v1.updateTransaction, remove: v1.deleteTransaction } : transactions;
    const invalid = await t.create(request('POST', base, {}), context()); expect(invalid.status).toBe(version === 'v1' ? 400 : 422); await contract(version, base, 'post', invalid);
    for (const authorization of ['', 'Bearer invalid', `Bearer ${jwt.sign({ userId: user, exp: 1 }, process.env.JWT_SECRET!)}`]) {
      const response = await t.create(request('POST', base, {}, { authorization }), context()); expect(response.status).toBe(401); await contract(version, base, 'post', response);
    }
    const badId = await t.remove(request('DELETE', `${base}/bad`), context('bad')); expect(badId.status).toBe(version === 'v1' ? 400 : 422); await contract(version, `${base}/{id}`, 'delete', badId);
    const malformed = new NextRequest(`http://localhost:3000${base}`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: '{' });
    const badJson = await t.create(malformed, context()); expect(badJson.status).toBe(400); await contract(version, base, 'post', badJson);
    const foreign = await seedTransaction(new Transaction({ userId: user, walletId: wallet, type: 'expense', amount: 1, date: new Date(), title: 'Test transaction' }));
    const denied = await t.remove(request('DELETE', `${base}/${foreign._id}`, undefined, { authorization: `Bearer ${otherToken}` }), context(String(foreign._id))); expect(denied.status).toBe(404); await contract(version, `${base}/{id}`, 'delete', denied);
  });
});
describe('v1 cookie authentication and CSRF', () => {
  it('accepts a cookie with trusted Origin; rejects missing/foreign Origin and invalid overriding Bearer', async () => {
    const body = { name: 'Cookie category', type: 'expense' };
    const cookie = `session_token=${token}`;
    for (const headers of ([{ cookie }, { cookie, origin: 'https://attacker.example' }, { cookie, origin: 'http://localhost:3000', authorization: 'Bearer invalid' }] as Record<string, string>[])) {
      const result = await v1.createCategory(request('POST', '/api/v1/categories', body, headers), context());
      expect(result.status).toBe('authorization' in headers ? 401 : 403);
    }
    const result = await v1.createCategory(request('POST', '/api/v1/categories', body, { cookie, origin: 'http://localhost:3000' }), context()); expect(result.status).toBe(201);
  });
});
