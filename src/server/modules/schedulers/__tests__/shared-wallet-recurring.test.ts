import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import WalletMember from '@/server/db/models/WalletMember';
import User from '@/server/db/models/User';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import Scheduler from '@/server/db/models/Scheduler';
import { signToken } from '@/server/shared/auth/crypto';
import { seedSharedWallet } from '@/test/shared-wallet-fixture';
import { v1 } from '@/server/shared/http/versioned-handlers';

vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));

let mongo: MongoMemoryReplSet;

const tulId = new Types.ObjectId().toString(); // Owner "Tul"
const guyId = new Types.ObjectId().toString(); // Contributor "Guy"
const bobId = new Types.ObjectId().toString(); // Another Contributor "Bob"
const outsiderId = new Types.ObjectId().toString(); // Non-member

function jsonRequest(url: string, method: string, actor: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${signToken({ userId: actor })}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function seedNamedUser(id: string, name: string, email: string) {
  return User.create({
    _id: id,
    name,
    email,
    passwordHash: 'not-a-real-hash',
    dataPrivacyConsent: true,
  });
}

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([
    Wallet.init(),
    WalletMember.init(),
    User.init(),
    Category.init(),
    Transaction.init(),
    Scheduler.init(),
  ]);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await Promise.all([
    Wallet.deleteMany({}),
    WalletMember.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    Transaction.collection.deleteMany({}),
    Scheduler.collection.deleteMany({}),
  ]);
  await seedNamedUser(tulId, 'Tul Owner', 'tul@example.com');
  await seedNamedUser(guyId, 'Guy Contributor', 'guy@example.com');
  await seedNamedUser(bobId, 'Bob Roommate', 'bob@example.com');
  await seedNamedUser(outsiderId, 'Outsider', 'outsider@example.com');
});

describe('US7-6: Recurring Transactions in Shared Wallets', () => {
  it('Scenario 1: Guy (Contributor) creates monthly recurring rule on shared wallet, auto-posts with Guy attribution, isolates rule management, and auto-cancels upon leaving', async () => {
    // Setup: Tul owns "Housemate Fund" shared wallet with Guy and Bob as accepted contributors
    const { wallet } = await seedSharedWallet(tulId, [
      { userId: guyId, status: 'accepted' },
      { userId: bobId, status: 'accepted' },
    ]);
    wallet.name = 'Housemate Fund';
    await wallet.save();
    const walletId = String(wallet._id);

    // Bangkok today date YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    // 1. Guy creates a recurring rule of ฿4,000.00 "Monthly" targeting "Housemate Fund"
    const createReq = jsonRequest('http://localhost:3000/api/v1/schedulers', 'POST', guyId, {
      walletId,
      categoryKey: 'food-drinks',
      type: 'expense',
      amount: 4000,
      title: 'Housemate Monthly Grocery',
      startDate: today,
      frequency: 'monthly',
      interval: 1,
      end: { type: 'never' },
    });
    const createRes = await v1.createScheduler(createReq, { params: Promise.resolve({ id: '' }) });
    expect(createRes.status).toBe(201);
    const createdData = (await createRes.json()).data;
    expect(createdData).toMatchObject({
      walletId,
      categoryKey: 'food-drinks',
      type: 'expense',
      amount: 4000,
      title: 'Housemate Monthly Grocery',
      status: 'active',
      canManage: true,
    });
    const schedulerId = createdData.id;

    // 2. Scheduler is saved under Guy's personal recurring page (Target: Housemate Fund)
    const guyListReq = jsonRequest('http://localhost:3000/api/v1/schedulers', 'GET', guyId);
    const guyListRes = await v1.listSchedulers(guyListReq, { params: Promise.resolve({ id: '' }) });
    expect(guyListRes.status).toBe(200);
    const guyRules = (await guyListRes.json()).data;
    expect(guyRules).toHaveLength(1);
    expect(guyRules[0].id).toBe(schedulerId);
    expect(guyRules[0].walletId).toBe(walletId);

    // Tul (Owner) or Bob (another contributor) do NOT see Guy's scheduler rule in their personal recurring page
    const tulListReq = jsonRequest('http://localhost:3000/api/v1/schedulers', 'GET', tulId);
    const tulListRes = await v1.listSchedulers(tulListReq, { params: Promise.resolve({ id: '' }) });
    expect((await tulListRes.json()).data).toHaveLength(0);

    const bobListReq = jsonRequest('http://localhost:3000/api/v1/schedulers', 'GET', bobId);
    const bobListRes = await v1.listSchedulers(bobListReq, { params: Promise.resolve({ id: '' }) });
    expect((await bobListRes.json()).data).toHaveLength(0);

    // 3. Allow only Guy to edit or delete the recurring scheduler rule itself
    // Tul attempts to GET, PUT, or DELETE Guy's rule -> 404
    const tulGetReq = jsonRequest(`http://localhost:3000/api/v1/schedulers/${schedulerId}`, 'GET', tulId);
    expect((await v1.getScheduler(tulGetReq, { params: Promise.resolve({ id: schedulerId }) })).status).toBe(404);

    const tulPutReq = jsonRequest(`http://localhost:3000/api/v1/schedulers/${schedulerId}`, 'PUT', tulId, {
      walletId,
      categoryKey: 'food-drinks',
      type: 'expense',
      amount: 5000,
      title: 'Hacked',
      startDate: today,
      frequency: 'monthly',
      interval: 1,
      end: { type: 'never' },
    });
    expect((await v1.updateScheduler(tulPutReq, { params: Promise.resolve({ id: schedulerId }) })).status).toBe(404);

    const tulDeleteReq = jsonRequest(`http://localhost:3000/api/v1/schedulers/${schedulerId}`, 'DELETE', tulId);
    expect((await v1.deleteScheduler(tulDeleteReq, { params: Promise.resolve({ id: schedulerId }) })).status).toBe(404);

    // Guy can edit the rule
    const guyPutReq = jsonRequest(`http://localhost:3000/api/v1/schedulers/${schedulerId}`, 'PUT', guyId, {
      walletId,
      categoryKey: 'food-drinks',
      type: 'expense',
      amount: 4500,
      title: 'Housemate Monthly Grocery Updated',
      startDate: today,
      frequency: 'monthly',
      interval: 1,
      end: { type: 'never' },
    });
    const guyPutRes = await v1.updateScheduler(guyPutReq, { params: Promise.resolve({ id: schedulerId }) });
    expect(guyPutRes.status).toBe(200);
    expect((await guyPutRes.json()).data.amount).toBe(4500);

    // 4. Auto-post occurrences to "Housemate Fund" with author attribution "Logged by Guy"
    // Because startDate was today, the first occurrence posted immediately upon creation!
    const postedTx = await Transaction.findOne({ walletId }).lean();
    expect(postedTx).not.toBeNull();
    expect(postedTx?.amount).toBe(4000);
    expect(String(postedTx?.userId)).toBe(guyId);
    expect(postedTx?.categoryKey).toBe('food-drinks');

    // 5. Auto-cancel the rule if Guy leaves the wallet
    const leaveReq = jsonRequest(`http://localhost:3000/api/v1/wallets/${walletId}/leave`, 'POST', guyId);
    const leaveRes = await v1.leaveWallet(leaveReq, { params: Promise.resolve({ id: walletId }) });
    expect(leaveRes.status).toBe(200);

    // Verify Guy's scheduler rule is now auto-cancelled with nextDueDate null
    const storedScheduler = await Scheduler.findById(schedulerId).lean();
    expect(storedScheduler?.status).toBe('cancelled');
    expect(storedScheduler?.nextDueDate).toBeNull();

    // Past transactions in "Housemate Fund" remain intact
    const remainingTx = await Transaction.findOne({ walletId }).lean();
    expect(remainingTx).not.toBeNull();
    expect(remainingTx?.amount).toBe(4000);
  });

  it('Scenario 1b: Auto-cancel recurring rule when owner removes contributor', async () => {
    const { wallet } = await seedSharedWallet(tulId, [
      { userId: guyId, status: 'accepted' },
    ]);
    const walletId = String(wallet._id);
    const today = new Date().toISOString().slice(0, 10);

    // Guy creates rule
    const createReq = jsonRequest('http://localhost:3000/api/v1/schedulers', 'POST', guyId, {
      walletId,
      categoryKey: 'food-drinks',
      type: 'expense',
      amount: 2000,
      title: 'Snack Fund',
      startDate: today,
      frequency: 'weekly',
      interval: 1,
      end: { type: 'never' },
    });
    const createRes = await v1.createScheduler(createReq, { params: Promise.resolve({ id: '' }) });
    const schedulerId = (await createRes.json()).data.id;

    // Owner Tul removes Guy from the wallet
    const removeReq = jsonRequest(`http://localhost:3000/api/v1/wallets/${walletId}/members/${guyId}`, 'DELETE', tulId);
    const removeRes = await v1.removeWalletMember(removeReq, { params: Promise.resolve({ id: walletId, userId: guyId }) });
    expect(removeRes.status).toBe(200);

    // Rule is auto-cancelled
    const stored = await Scheduler.findById(schedulerId).lean();
    expect(stored?.status).toBe('cancelled');
    expect(stored?.nextDueDate).toBeNull();
  });

  it('Scenario 2: Shared wallet ledger shows transactions posted by recurring scheduler with author attribution; members can view and author/owner can edit/delete per US7-5', async () => {
    const { wallet } = await seedSharedWallet(tulId, [
      { userId: guyId, status: 'accepted' },
      { userId: bobId, status: 'accepted' },
    ]);
    const walletId = String(wallet._id);
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    // Guy creates recurring rule targeting Housemate Fund
    const createReq = jsonRequest('http://localhost:3000/api/v1/schedulers', 'POST', guyId, {
      walletId,
      categoryKey: 'utilities',
      type: 'expense',
      amount: 1500,
      title: 'High Speed Internet',
      startDate: today,
      frequency: 'monthly',
      interval: 1,
      end: { type: 'never' },
    });
    await v1.createScheduler(createReq, { params: Promise.resolve({ id: '' }) });

    // View shared wallet ledger as Tul (Owner)
    const tulTxListReq = jsonRequest(`http://localhost:3000/api/v1/wallets/${walletId}/transactions?month=${currentMonth}`, 'GET', tulId);
    const tulTxListRes = await v1.listSharedWalletTransactions(tulTxListReq, { params: Promise.resolve({ id: walletId }) });
    expect(tulTxListRes.status).toBe(200);
    const tulTxs = (await tulTxListRes.json()).data;
    expect(tulTxs).toHaveLength(1);
    expect(tulTxs[0]).toMatchObject({
      walletId,
      amount: 1500,
      title: 'High Speed Internet',
      createdBy: {
        id: guyId,
        name: 'Guy Contributor',
      },
    });
    const txId = tulTxs[0].id;

    // View shared wallet ledger as Guy (Contributor)
    const guyTxListReq = jsonRequest(`http://localhost:3000/api/v1/wallets/${walletId}/transactions?month=${currentMonth}`, 'GET', guyId);
    const guyTxListRes = await v1.listSharedWalletTransactions(guyTxListReq, { params: Promise.resolve({ id: walletId }) });
    expect(guyTxListRes.status).toBe(200);
    const guyTxs = (await guyTxListRes.json()).data;
    expect(guyTxs[0].createdBy.name).toBe('Guy Contributor');

    // Guy (creator) edits the posted transaction
    const guyEditTxReq = jsonRequest(`http://localhost:3000/api/v1/transactions/${txId}`, 'PUT', guyId, {
      type: 'expense',
      amount: 1600,
      date: today,
      title: 'High Speed Internet + Mesh Wi-Fi',
      categoryKey: 'utilities',
    });
    const guyEditTxRes = await v1.updateTransaction(guyEditTxReq, { params: Promise.resolve({ id: txId }) });
    expect(guyEditTxRes.status).toBe(200);
    expect((await guyEditTxRes.json()).data.amount).toBe(1600);

    // Tul (Owner) can edit the transaction per shared wallet permissions (US7-5)
    const tulEditTxReq = jsonRequest(`http://localhost:3000/api/v1/transactions/${txId}`, 'PUT', tulId, {
      type: 'expense',
      amount: 1600,
      date: today,
      title: 'High Speed Internet + Mesh Wi-Fi (Tul reviewed)',
      categoryKey: 'utilities',
    });
    const tulEditTxRes = await v1.updateTransaction(tulEditTxReq, { params: Promise.resolve({ id: txId }) });
    expect(tulEditTxRes.status).toBe(200);
    const updatedByTul = (await tulEditTxRes.json()).data;
    expect(updatedByTul.title).toBe('High Speed Internet + Mesh Wi-Fi (Tul reviewed)');
    expect(updatedByTul.editedBy).toMatchObject({ id: tulId, name: 'Tul Owner' });

    // Tul (Owner) can delete the posted transaction
    const tulDeleteTxReq = jsonRequest(`http://localhost:3000/api/v1/transactions/${txId}`, 'DELETE', tulId);
    const tulDeleteTxRes = await v1.deleteTransaction(tulDeleteTxReq, { params: Promise.resolve({ id: txId }) });
    expect(tulDeleteTxRes.status).toBe(200);

    // Verify transaction is deleted from ledger
    const remainingInLedger = await Transaction.findById(txId);
    expect(remainingInLedger).toBeNull();
  });
});
