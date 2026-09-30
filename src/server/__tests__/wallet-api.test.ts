import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Wallet from '@/server/db/models/Wallet';
import { signToken } from '@/server/shared/auth/crypto';

vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }))
import { GET as listRoute, POST as createRoute } from '@/app/api/v1/wallets/route';
import { GET as getRoute, PUT as updateRoute } from '@/app/api/v1/wallets/[id]/route';;

import { v1 } from '@/server/shared/http/versioned-handlers';

const userId = new mongoose.Types.ObjectId().toString();
const otherUserId = new mongoose.Types.ObjectId().toString();
const token = signToken({ userId });
const context = (id = '') => ({ params: Promise.resolve({ id }) });
const request = (path: string, authorization?: string) => new NextRequest(`http://localhost:3000${path}`, {
  method: 'GET',
  headers: authorization ? { authorization } : undefined,
});

let mongo: MongoMemoryReplSet;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Wallet.init();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await Wallet.deleteMany({});
});

//=============== PUT Method tests ===============//
const put = (id: string, body: unknown, ...authorization: [string?]) => {
  const auth = authorization.length === 0 ? `Bearer ${token}` : authorization[0];
  return updateRoute(
    new NextRequest(`http://localhost:3000/api/v1/wallets/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
      body: JSON.stringify(body),
    }),
    context(id),
  );
};
const seedTravelFund = () => Wallet.create({
  userId,
  name: 'Travel Fund',
  color: '#112233',
  balance: 500,
  isSaving: true,
  goalAmount: 2000,
});

describe('PUT /api/v1/wallets/{id}', () => {
  it('renames the wallet and changes its color, visible in both the list and get-by-id', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { name: 'Trip to Japan', color: '#AABBCC' });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ status: true });
    expect(payload.data).toMatchObject({ id: String(wallet._id), name: 'Trip to Japan', color: '#AABBCC' });

    const list = await listRoute(request('/api/v1/wallets', `Bearer ${token}`));
    expect((await list.json()).data).toContainEqual(
      expect.objectContaining({ id: String(wallet._id), name: 'Trip to Japan', color: '#AABBCC' }),
    );
    const single = await getRoute(request(`/api/v1/wallets/${wallet._id}`, `Bearer ${token}`), context(String(wallet._id)));
    expect((await single.json()).data).toMatchObject({ name: 'Trip to Japan', color: '#AABBCC' });
  });

  it('keeps the name when only the color is edited', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { color: '#AABBCC' });

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ name: 'Travel Fund', color: '#AABBCC' });
    expect((await Wallet.findById(wallet._id))!.name).toBe('Travel Fund');
  });

  it('keeps the color when only the name is edited', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { name: 'Trip to Japan' });

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ name: 'Trip to Japan', color: '#112233' });
  });

  it('trims the name', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { name: '  Trip to Japan  ' });

    expect(response.status).toBe(200);
    expect((await Wallet.findById(wallet._id))!.name).toBe('Trip to Japan');
  });

  it('ignores balance, saving status, goal, owner, default flag and unknown fields', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), {
      name: 'Trip to Japan',
      balance: 999999,
      isSaving: false,
      goalAmount: 1,
      userId: otherUserId,
      isDefault: true,
      unknownField: 'ignored',
    });

    expect(response.status).toBe(200);
    const stored = await Wallet.findById(wallet._id).lean();
    expect(stored!.name).toBe('Trip to Japan');
    expect(stored!.balance).toBe(500);
    expect(stored!.isSaving).toBe(true);
    expect(stored!.goalAmount).toBe(2000);
    expect(stored!.isDefault).toBe(false);
    expect(String(stored!.userId)).toBe(userId);
    expect(stored).not.toHaveProperty('unknownField');
  });

  it('returns 200 and changes nothing for an empty body (partial update)', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), {});

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ name: 'Travel Fund', color: '#112233' });
  });

  it("returns 404 for another user's wallet and leaves it untouched", async () => {
    const wallet = await Wallet.create({ userId: otherUserId, name: 'Private', color: '#112233' });

    const response = await put(String(wallet._id), { name: 'Stolen', color: '#AABBCC' });

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
    expect(await Wallet.findById(wallet._id)).toMatchObject({ name: 'Private', color: '#112233' });
  });

  it('returns 404 for a well-formed id that does not exist', async () => {
    const response = await put(new mongoose.Types.ObjectId().toString(), { name: 'Ghost' });

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for an invalid wallet id', async () => {
    const response = await put('not-an-object-id', { name: 'Anything' });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when renaming to another wallet name of the same user, changing nothing', async () => {
    await Wallet.create({ userId, name: 'Main' });
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { name: 'Main', color: '#AABBCC' });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('CONFLICT');
    expect(await Wallet.findById(wallet._id)).toMatchObject({ name: 'Travel Fund', color: '#112233' });
  });

  it('treats a whitespace-padded name as a duplicate', async () => {
    await Wallet.create({ userId, name: 'Main' });
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { name: '  Main  ' });

    expect(response.status).toBe(409);
  });

  it('allows saving a wallet under its own current name', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { name: 'Travel Fund', color: '#AABBCC' });

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ name: 'Travel Fund', color: '#AABBCC' });
  });

  it("allows a name that another user's wallet already uses", async () => {
    await Wallet.create({ userId: otherUserId, name: 'Main' });
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { name: 'Main' });

    expect(response.status).toBe(200);
  });

  it.each([
    ['a blank name', { name: '   ' }],
    ['a name over 50 characters', { name: 'a'.repeat(51) }],
    ['an invalid color', { color: 'red' }],
    ['a null name', { name: null }],
  ])('returns 400 for %s and changes nothing', async (_label, body) => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), body);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    expect(await Wallet.findById(wallet._id)).toMatchObject({ name: 'Travel Fund', color: '#112233' });
  });

  it('returns 400 for malformed JSON', async () => {
    const wallet = await seedTravelFund();
    const malformed = new NextRequest(`http://localhost:3000/api/v1/wallets/${wallet._id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: '{',
    });

    const response = await updateRoute(malformed, context(String(wallet._id)));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_JSON');
  });

  it('returns 401 without a login and changes nothing', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { name: 'Trip to Japan' }, undefined);

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('UNAUTHORIZED');
    expect((await Wallet.findById(wallet._id))!.name).toBe('Travel Fund');
  });
});

// Depends on #78 (US6-4): keep only if the eye toggle is persisted server-side.
// If #78 decides against it, delete this block and add `hideBalance: true` to the
// "ignores ..." test above so it is asserted as not editable.
describe('PUT /api/v1/wallets/{id} — hideBalance (pending #78)', () => {
  it('updates hideBalance and leaves the other settings alone', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { hideBalance: true });

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ hideBalance: true, name: 'Travel Fund' });
    expect((await Wallet.findById(wallet._id))!.hideBalance).toBe(true);
  });

  it('can turn hideBalance back off', async () => {
    const wallet = await Wallet.create({ userId, name: 'Hidden', hideBalance: true });

    const response = await put(String(wallet._id), { hideBalance: false });

    expect(response.status).toBe(200);
    expect((await Wallet.findById(wallet._id))!.hideBalance).toBe(false);
  });

  it('returns 400 for a non-boolean hideBalance and changes nothing', async () => {
    const wallet = await seedTravelFund();

    const response = await put(String(wallet._id), { hideBalance: 'yes' });

    expect(response.status).toBe(400);
    expect((await Wallet.findById(wallet._id))!.hideBalance).toBe(false);
  });
});