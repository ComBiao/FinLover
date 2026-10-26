import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import WalletMember from '@/server/db/models/WalletMember';
import User from '@/server/db/models/User';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import { signToken } from '@/server/shared/auth/crypto';
import { seedSharedWallet } from '@/test/shared-wallet-fixture';
import { v1 } from '@/server/shared/http/versioned-handlers';
import { sharedHomeSummaryResponse, sharedTransactionResponse } from '@/shared/contracts';

vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));

let mongo: MongoMemoryReplSet;
const [owner, member, outsider] = Array.from({ length: 3 }, () => new Types.ObjectId().toString());

function req(url: string, method: string, actor: string | null, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      ...(actor ? { authorization: `Bearer ${signToken({ userId: actor })}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const ctx = (id: string = '') => ({ params: Promise.resolve({ id }) });

async function insertTx(data: {
  userId: string;
  walletId: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  title: string;
  note?: string;
  categoryId?: string | null;
  categoryKey?: string;
  updatedBy?: string;
}) {
  const _id = new Types.ObjectId();
  const doc = {
    _id,
    userId: new Types.ObjectId(data.userId),
    walletId: new Types.ObjectId(data.walletId),
    type: data.type,
    amount: data.amount,
    date: data.date,
    title: data.title,
    note: data.note,
    categoryId: data.categoryId ? new Types.ObjectId(data.categoryId) : null,
    categoryKey: data.categoryKey,
    updatedBy: data.updatedBy ? new Types.ObjectId(data.updatedBy) : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await Transaction.collection.insertOne(doc);
  return doc;
}

describe('Shared Wallet Transactions and Lifecycle Integration (Epic 7)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(mongo.getUri());
    await Promise.all([Wallet.init(), WalletMember.init(), User.init(), Category.init(), Transaction.init()]);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      Wallet.deleteMany({}),
      WalletMember.deleteMany({}),
      User.deleteMany({}),
      Category.deleteMany({}),
      Transaction.collection.deleteMany({}),
    ]);
    await User.create({ _id: owner, email: 'owner@example.com', name: 'Owner User', passwordHash: 'hash', dataPrivacyConsent: true });
    await User.create({ _id: member, email: 'member@example.com', name: 'Member User', passwordHash: 'hash', dataPrivacyConsent: true });
    await User.create({ _id: outsider, email: 'outsider@example.com', name: 'Outsider User', passwordHash: 'hash', dataPrivacyConsent: true });
  });

  describe('E7-11: Shared Transaction Creation and Categories', () => {
    it('creates a transaction on a shared wallet defaulting to Others and adjusts wallet balance', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      const request = req('http://localhost:3000/api/v1/transactions', 'POST', member, {
        walletId,
        type: 'expense',
        amount: 250,
        date: '2026-10-15',
        title: 'Team Dinner',
        note: 'Pizza and drinks',
      });

      const res = await v1.createTransaction(request, ctx());
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe(true);

      const tx = sharedTransactionResponse.parse(body.data);
      expect(tx.walletId).toBe(walletId);
      expect(tx.amount).toBe(250);
      expect(tx.type).toBe('expense');
      expect(tx.title).toBe('Team Dinner');
      expect(tx.createdBy).toEqual({ id: member, name: 'Member User' });
      expect(tx).not.toHaveProperty('categoryId');
      expect(tx.category).toEqual({ key: 'others-expense', name: 'Others', icon: 'MoreHorizontal', color: '#4B5563' });

      const updatedWallet = await Wallet.findById(walletId);
      expect(updatedWallet?.balance).toBe(-250);
    });

    it('stores the chosen preset categoryKey, so any member sees the same category', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      const createReq = req('http://localhost:3000/api/v1/transactions', 'POST', member, {
        walletId, categoryKey: 'food-drinks', type: 'expense', amount: 90, date: '2026-10-15', title: 'Noodles',
      });
      const created = sharedTransactionResponse.parse((await (await v1.createTransaction(createReq, ctx())).json()).data);
      expect(created.category).toEqual({ key: 'food-drinks', name: 'Food & Drinks', icon: 'Utensils', color: '#EA580C' });
      expect((await Transaction.findById(created.id))?.categoryKey).toBe('food-drinks');
      expect((await Transaction.findById(created.id))?.categoryId).toBeNull();

      const listReq = req(`http://localhost:3000/api/v1/wallets/${walletId}/transactions?month=2026-10`, 'GET', owner);
      const listed = (await (await v1.listSharedWalletTransactions(listReq, ctx(walletId))).json()).data;
      expect(listed[0].category.key).toBe('food-drinks');
    });

    it('rejects an unknown categoryKey or one that belongs to the other type with 400', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);
      const create = (categoryKey: string, type: 'income' | 'expense') => v1.createTransaction(
        req('http://localhost:3000/api/v1/transactions', 'POST', member, { walletId, categoryKey, type, amount: 10, date: '2026-10-15', title: 'X' }),
        ctx(),
      );

      expect((await create('not-a-category', 'expense')).status).toBe(400);
      const mismatch = await create('salary', 'expense');
      expect(mismatch.status).toBe(400);
      expect((await mismatch.json()).error.fields?.categoryKey).toBe('Category does not exist or does not match the transaction type');
      expect((await Wallet.findById(walletId))?.balance).toBe(0);
    });

    it('rejects categoryKey on a personal wallet with 400', async () => {
      const personal = await Wallet.create({ userId: owner, name: 'Personal', balance: 0 });
      const res = await v1.createTransaction(
        req('http://localhost:3000/api/v1/transactions', 'POST', owner, {
          walletId: String(personal._id), categoryKey: 'food-drinks', type: 'expense', amount: 10, date: '2026-10-15', title: 'X',
        }),
        ctx(),
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error.fields?.categoryKey).toBe('Category key is only allowed for shared wallets');
    });

    it('rejects categoryId on shared wallet creation with 400 when category is provided', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      // Sending explicit categoryId string is rejected
      const cat = await Category.create({ userId: member, name: 'Food', type: 'expense', isSystem: false });
      const strCatReq = req('http://localhost:3000/api/v1/transactions', 'POST', member, {
        walletId,
        categoryId: String(cat._id),
        type: 'expense',
        amount: 100,
        date: '2026-10-15',
        title: 'Lunch',
      });
      const strRes = await v1.createTransaction(strCatReq, ctx());
      expect(strRes.status).toBe(400);
      const strBody = await strRes.json();
      expect(strBody.error.fields?.categoryId).toBe('Category is not allowed for shared wallets');

      // Sending categoryId: null is accepted
      const nullCatReq = req('http://localhost:3000/api/v1/transactions', 'POST', member, {
        walletId,
        categoryId: null,
        type: 'expense',
        amount: 100,
        date: '2026-10-15',
        title: 'Lunch 2',
      });
      const nullRes = await v1.createTransaction(nullCatReq, ctx());
      expect(nullRes.status).toBe(201);
    });

    it('rejects outsiders creating transactions on a shared wallet with 403', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      const request = req('http://localhost:3000/api/v1/transactions', 'POST', outsider, {
        walletId,
        type: 'income',
        amount: 500,
        date: '2026-10-15',
        title: 'Contribution',
      });

      const res = await v1.createTransaction(request, ctx());
      expect(res.status).toBe(403);
    });
  });

  describe('E7-11 & E7-06: Shared Wallet Month Transactions List and Attribution', () => {
    it('lists transactions for a shared wallet by month with dual attribution and preset categories', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      // Member creates a transaction
      const tx1 = await insertTx({
        userId: member,
        walletId,
        type: 'expense',
        amount: 150,
        date: new Date('2026-10-10T10:00:00.000Z'),
        title: 'Snacks',
        categoryKey: 'food-drinks',
      });

      // Owner updates member's transaction
      await Transaction.collection.updateOne(
        { _id: tx1._id },
        { $set: { updatedBy: new Types.ObjectId(owner), amount: 180 } }
      );

      // Owner creates another transaction
      await insertTx({
        userId: owner,
        walletId,
        type: 'income',
        amount: 1000,
        date: new Date('2026-10-12T12:00:00.000Z'),
        title: 'Shared Fund Topup',
      });

      const listReq = req(`http://localhost:3000/api/v1/wallets/${walletId}/transactions?month=2026-10`, 'GET', member);
      const res = await v1.listSharedWalletTransactions(listReq, ctx(walletId));
      expect(res.status).toBe(200);

      interface SharedTxItem {
        id: string;
        title: string;
        amount: number;
        type: string;
        date: string;
        createdBy?: { id: string; name: string };
        editedBy?: { id: string; name: string };
        categoryId?: unknown;
        category?: { key: string };
      }
      const body = (await res.json()) as { status: boolean; data: SharedTxItem[] };
      expect(body.status).toBe(true);
      expect(body.data).toHaveLength(2);

      const topup = body.data.find(d => d.title === 'Shared Fund Topup');
      expect(topup).toBeDefined();
      expect(topup!.createdBy).toEqual({ id: owner, name: 'Owner User' });
      expect(topup!.editedBy).toBeUndefined();
      expect(topup).not.toHaveProperty('categoryId');
      // Rows saved without a key count as the type's Others
      expect(topup!.category?.key).toBe('others-income');

      const snacks = body.data.find(d => d.title === 'Snacks');
      expect(snacks).toBeDefined();
      expect(snacks!.createdBy).toEqual({ id: member, name: 'Member User' });
      expect(snacks!.editedBy).toEqual({ id: owner, name: 'Owner User' });
      expect(snacks!.amount).toBe(180);
      expect(snacks).not.toHaveProperty('categoryId');
      expect(snacks!.category?.key).toBe('food-drinks');
    });

    it('falls back to "Deleted user" for deleted accounts and "Unnamed user" for nameless users', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      const namelessUserId = new Types.ObjectId().toString();
      await User.create({ _id: namelessUserId, email: 'nameless@example.com', passwordHash: 'hash', dataPrivacyConsent: true });

      const deletedUserId = new Types.ObjectId().toString();

      await insertTx({
        userId: namelessUserId,
        updatedBy: deletedUserId,
        walletId,
        type: 'expense',
        amount: 50,
        date: new Date('2026-10-05T10:00:00.000Z'),
        title: 'Coffee',
      });

      const listReq = req(`http://localhost:3000/api/v1/wallets/${walletId}/transactions?month=2026-10`, 'GET', owner);
      const res = await v1.listSharedWalletTransactions(listReq, ctx(walletId));
      expect(res.status).toBe(200);

      const body = await res.json();
      const coffee = body.data[0];
      expect(coffee.createdBy).toEqual({ id: namelessUserId, name: 'Unnamed user' });
      expect(coffee.editedBy).toEqual({ id: deletedUserId, name: 'Deleted user' });
    });

    it('rejects outsider and non-existent wallet access with 403 / 404', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      const outsiderReq = req(`http://localhost:3000/api/v1/wallets/${walletId}/transactions?month=2026-10`, 'GET', outsider);
      const res403 = await v1.listSharedWalletTransactions(outsiderReq, ctx(walletId));
      expect(res403.status).toBe(403);

      const fakeId = new Types.ObjectId().toString();
      const notFoundReq = req(`http://localhost:3000/api/v1/wallets/${fakeId}/transactions?month=2026-10`, 'GET', owner);
      const res404 = await v1.listSharedWalletTransactions(notFoundReq, ctx(fakeId));
      expect(res404.status).toBe(404);
    });
  });

  describe('E7-13: Member Cross-Author Update and Delete', () => {
    it('allows any accepted member to edit any transaction in a shared wallet with dual attribution', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      // Owner creates transaction (-100)
      const tx = await insertTx({
        userId: owner,
        walletId,
        type: 'expense',
        amount: 100,
        date: new Date('2026-10-10T10:00:00.000Z'),
        title: 'Supplies',
      });
      await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: -100 } });

      // Member updates transaction from 100 to 150
      const updateReq = req(`http://localhost:3000/api/v1/transactions/${tx._id}`, 'PUT', member, {
        amount: 150,
        type: 'expense',
        date: '2026-10-10',
        title: 'Office Supplies',
      });
      const res = await v1.updateTransaction(updateReq, ctx(String(tx._id)));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe(true);
      const updatedTx = sharedTransactionResponse.parse(body.data);
      expect(updatedTx.title).toBe('Office Supplies');
      expect(updatedTx.amount).toBe(150);
      expect(updatedTx.createdBy).toEqual({ id: owner, name: 'Owner User' });
      expect(updatedTx.editedBy).toEqual({ id: member, name: 'Member User' });
      expect(updatedTx).not.toHaveProperty('categoryId');

      // Balance was -100, now should be -150
      const updatedWallet = await Wallet.findById(walletId);
      expect(updatedWallet?.balance).toBe(-150);

      // If the original author updates their own transaction, editedBy is omitted
      const selfUpdateReq = req(`http://localhost:3000/api/v1/transactions/${tx._id}`, 'PUT', owner, {
        amount: 160,
        type: 'expense',
        date: '2026-10-10',
        title: 'Office Supplies (Final)',
      });
      const selfRes = await v1.updateTransaction(selfUpdateReq, ctx(String(tx._id)));
      expect(selfRes.status).toBe(200);
      const selfBody = await selfRes.json();
      expect(selfBody.data.createdBy).toEqual({ id: owner, name: 'Owner User' });
      expect(selfBody.data.editedBy).toBeUndefined();
    });

    it('lets another member change the category, keeps it when omitted and resets it when the type changes', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);
      const tx = await insertTx({ userId: owner, walletId, type: 'expense', amount: 100, date: new Date('2026-10-10T10:00:00.000Z'), title: 'Bus', categoryKey: 'transportation' });
      await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: -100 } });
      const update = (as: string, body: Record<string, unknown>) => v1.updateTransaction(
        req(`http://localhost:3000/api/v1/transactions/${tx._id}`, 'PUT', as, { amount: 100, type: 'expense', date: '2026-10-10', title: 'Bus', ...body }),
        ctx(String(tx._id)),
      );

      // Omitted keeps the author's category
      expect((await (await update(member, {})).json()).data.category.key).toBe('transportation');
      // Another member picks a different one
      expect((await (await update(member, { categoryKey: 'shopping' })).json()).data.category.key).toBe('shopping');
      // null resets to Others
      expect((await (await update(owner, { categoryKey: null })).json()).data.category.key).toBe('others-expense');
      // A key of the other type is rejected and nothing changes
      expect((await update(member, { categoryKey: 'salary' })).status).toBe(400);
      // Switching type with no key falls back to the new type's Others
      await update(member, { categoryKey: 'health' });
      const switched = await (await update(member, { type: 'income' })).json();
      expect(switched.data.category.key).toBe('others-income');
    });

    it('rejects changing walletId or providing categoryId on shared transaction update', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);
      const tx = await insertTx({
        userId: owner,
        walletId,
        type: 'expense',
        amount: 100,
        date: new Date('2026-10-10T10:00:00.000Z'),
        title: 'Supplies',
      });

      // Try to change wallet
      const otherWalletId = new Types.ObjectId().toString();
      const moveReq = req(`http://localhost:3000/api/v1/transactions/${tx._id}`, 'PUT', member, {
        walletId: otherWalletId,
        amount: 100,
        type: 'expense',
        date: '2026-10-10',
        title: 'Supplies',
      });
      const moveRes = await v1.updateTransaction(moveReq, ctx(String(tx._id)));
      expect(moveRes.status).toBe(400);

      // Try to provide category
      const catReq = req(`http://localhost:3000/api/v1/transactions/${tx._id}`, 'PUT', member, {
        categoryId: new Types.ObjectId().toString(),
        amount: 100,
        type: 'expense',
        date: '2026-10-10',
        title: 'Supplies',
      });
      const catRes = await v1.updateTransaction(catReq, ctx(String(tx._id)));
      expect(catRes.status).toBe(400);
    });

    it('rejects outsider trying to update or delete a shared transaction with exact message', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);
      const tx = await insertTx({
        userId: owner,
        walletId,
        type: 'expense',
        amount: 100,
        date: new Date('2026-10-10T10:00:00.000Z'),
        title: 'Supplies',
      });

      const updateReq = req(`http://localhost:3000/api/v1/transactions/${tx._id}`, 'PUT', outsider, {
        amount: 200,
        type: 'expense',
        date: '2026-10-10',
        title: 'Supplies',
      });
      const updateRes = await v1.updateTransaction(updateReq, ctx(String(tx._id)));
      expect(updateRes.status).toBe(403);
      const updateBody = await updateRes.json();
      expect(updateBody.error.message).toBe('Only the member of the wallet can modify this transaction');

      const deleteReq = req(`http://localhost:3000/api/v1/transactions/${tx._id}`, 'DELETE', outsider);
      const deleteRes = await v1.deleteTransaction(deleteReq, ctx(String(tx._id)));
      expect(deleteRes.status).toBe(403);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.error.message).toBe('Only the member of the wallet can modify this transaction');
    });

    it('allows any accepted member to delete any transaction and reverses balance properly', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      const tx = await insertTx({
        userId: owner,
        walletId,
        type: 'expense',
        amount: 300,
        date: new Date('2026-10-10T10:00:00.000Z'),
        title: 'Groceries',
      });
      await Wallet.findByIdAndUpdate(walletId, { balance: -300 });

      // Member deletes owner's transaction
      const deleteReq = req(`http://localhost:3000/api/v1/transactions/${tx._id}`, 'DELETE', member);
      const deleteRes = await v1.deleteTransaction(deleteReq, ctx(String(tx._id)));
      expect(deleteRes.status).toBe(200); // v1 returns 200 with status: true

      const deletedDoc = await Transaction.findById(tx._id);
      expect(deletedDoc).toBeNull();

      const updatedWallet = await Wallet.findById(walletId);
      expect(updatedWallet?.balance).toBe(0);
    });
  });

  describe('E7-10: Personal Read Isolation', () => {
    it('excludes shared wallet transactions from personal list and summary', async () => {
      // Create personal wallet and transaction for owner
      const personalWallet = await Wallet.create({ userId: owner, name: 'Personal Wallet', isShared: false, balance: 500 });
      await insertTx({
        userId: owner,
        walletId: personalWallet._id.toString(),
        type: 'income',
        amount: 500,
        date: new Date('2026-10-01T10:00:00.000Z'),
        title: 'Salary',
      });

      // Create shared wallet and transaction authored by owner
      const { wallet: sharedWallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      await insertTx({
        userId: owner,
        walletId: sharedWallet._id.toString(),
        type: 'income',
        amount: 1000,
        date: new Date('2026-10-05T10:00:00.000Z'),
        title: 'Shared Deposit',
      });

      // Check personal transactions list: GET /api/v1/transactions?month=2026-10
      const listReq = req('http://localhost:3000/api/v1/transactions?month=2026-10', 'GET', owner);
      const listRes = await v1.listTransactions(listReq, ctx());
      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      expect(listBody.data).toHaveLength(1);
      expect(listBody.data[0].title).toBe('Salary');

      // Check personal transaction summary: GET /api/v1/transactions/summary
      const sumReq = req('http://localhost:3000/api/v1/transactions/summary?from=2026-10-01&to=2026-10-31', 'GET', owner);
      const sumRes = await v1.transactionSummary(sumReq, ctx());
      expect(sumRes.status).toBe(200);
      const sumBody = await sumRes.json();
      expect(sumBody.data.totalIncome).toBe(500);
      expect(sumBody.data.netBalance).toBe(500);
    });
  });

  describe('E7-09-API: Shared Wallet Deletion Cascade and Permissions', () => {
    it('owner deleting shared wallet cascades all transactions across all authors and memberships', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      // Create transactions from owner and from member
      await insertTx({ userId: owner, walletId, type: 'income', amount: 500, date: new Date('2026-10-01'), title: 'Owner Tx' });
      await insertTx({ userId: member, walletId, type: 'expense', amount: 200, date: new Date('2026-10-02'), title: 'Member Tx' });

      const delReq = req(`http://localhost:3000/api/v1/wallets/${walletId}`, 'DELETE', owner);
      const delRes = await v1.deleteWallet(delReq, ctx(walletId));
      expect(delRes.status).toBe(200);

      expect(await Wallet.findById(walletId)).toBeNull();
      expect(await WalletMember.find({ walletId })).toHaveLength(0);
      expect(await Transaction.find({ walletId })).toHaveLength(0);
    });

    it('rejects contributor deleting shared wallet with 403', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      const delReq = req(`http://localhost:3000/api/v1/wallets/${walletId}`, 'DELETE', member);
      const delRes = await v1.deleteWallet(delReq, ctx(walletId));
      expect(delRes.status).toBe(403);
      const body = await delRes.json();
      expect(body.error.message).toBe('Only the wallet owner can perform this action');
    });
  });

  describe('E7-15: Shared Home Summary', () => {
    it('computes home summary and top categories across all members for a shared wallet', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);
      await Wallet.findByIdAndUpdate(walletId, { balance: 800 });

      // Owner income 1000, Member expense 200
      await insertTx({ userId: owner, walletId, type: 'income', amount: 1000, date: new Date('2026-10-01T10:00:00.000Z'), title: 'Deposit' });
      await insertTx({ userId: member, walletId, type: 'expense', amount: 200, date: new Date('2026-10-02T10:00:00.000Z'), title: 'Lunch', categoryKey: 'food-drinks' });
      await insertTx({ userId: owner, walletId, type: 'expense', amount: 150, date: new Date('2026-10-03T10:00:00.000Z'), title: 'Dinner', categoryKey: 'food-drinks' });
      await insertTx({ userId: owner, walletId, type: 'expense', amount: 80, date: new Date('2026-10-04T10:00:00.000Z'), title: 'Misc' });
      await insertTx({ userId: member, walletId, type: 'expense', amount: 30, date: new Date('2026-10-05T10:00:00.000Z'), title: 'Bus', categoryKey: 'transportation' });

      // Member views summary
      const sumReq = req(`http://localhost:3000/api/v1/home/summary?month=2026-10&walletId=${walletId}`, 'GET', member);
      const sumRes = await v1.homeSummary(sumReq, ctx());
      expect(sumRes.status).toBe(200);

      const body = await sumRes.json();
      expect(body.status).toBe(true);
      expect(body.data.walletId).toBe(walletId);
      expect(body.data.income).toBe(1000);
      expect(body.data.expense).toBe(460);
      expect(body.data.net).toEqual({ net: 540, status: 'surplus' });
      expect(body.data.balance.totalBalance).toBe(800);
      // Every author's rows are grouped by preset; rows without a key count as Others
      expect(body.data.topCategories).toEqual([
        { rank: 1, categoryId: null, categoryKey: 'food-drinks', name: 'Food & Drinks', icon: 'Utensils', color: '#EA580C', amount: 350 },
        { rank: 2, categoryId: null, categoryKey: 'others-expense', name: 'Others', icon: 'MoreHorizontal', color: '#4B5563', amount: 80 },
        { rank: 3, categoryId: null, categoryKey: 'transportation', name: 'Transportation', icon: 'Car', color: '#2563EB', amount: 30 },
      ]);
      sharedHomeSummaryResponse.parse(body.data);
    });

    it('rejects outsider reading shared home summary with 403', async () => {
      const { wallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const walletId = String(wallet._id);

      const sumReq = req(`http://localhost:3000/api/v1/home/summary?month=2026-10&walletId=${walletId}`, 'GET', outsider);
      const sumRes = await v1.homeSummary(sumReq, ctx());
      expect(sumRes.status).toBe(403);
    });

    it('excludes shared wallets when walletId=all', async () => {
      // Personal wallet for owner
      const pWallet = await Wallet.create({ userId: owner, name: 'Personal', isShared: false, balance: 500 });
      await insertTx({ userId: owner, walletId: pWallet._id.toString(), type: 'income', amount: 500, date: new Date('2026-10-01'), title: 'Salary' });

      // Shared wallet for owner
      const { wallet: sWallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      await Wallet.findByIdAndUpdate(sWallet._id, { balance: 10000 });
      await insertTx({ userId: owner, walletId: sWallet._id.toString(), type: 'income', amount: 10000, date: new Date('2026-10-01'), title: 'Big Shared' });

      const sumReq = req('http://localhost:3000/api/v1/home/summary?month=2026-10&walletId=all', 'GET', owner);
      const sumRes = await v1.homeSummary(sumReq, ctx());
      expect(sumRes.status).toBe(200);

      const body = await sumRes.json();
      expect(body.data.balance.totalBalance).toBe(500);
      expect(body.data.income).toBe(500);
    });
  });

  describe('Review fixes regression and isolation tests', () => {
    it('clears note on edit when note is omitted or undefined', async () => {
      const pWallet = await Wallet.create({ userId: owner, name: 'Personal Wallet', isShared: false, balance: 100 });
      const tx = await insertTx({
        userId: owner,
        walletId: pWallet._id.toString(),
        type: 'expense',
        amount: 50,
        date: new Date('2026-10-10'),
        title: 'Team Coffee',
        note: 'with team',
      });

      const updateReq = req(`http://localhost:3000/api/v1/transactions/${tx._id.toString()}`, 'PUT', owner, {
        title: 'Team Coffee',
        amount: 50,
        type: 'expense',
        date: '2026-10-10',
        walletId: pWallet._id.toString(),
      });
      const updateRes = await v1.updateTransaction(updateReq, ctx(tx._id.toString()));
      expect(updateRes.status).toBe(200);
      const doc = await Transaction.findById(tx._id);
      expect(doc!.note).toBeFalsy();
    });

    it('rejects moving a personal transaction into a shared wallet with 400', async () => {
      const pWallet = await Wallet.create({ userId: owner, name: 'Personal Wallet', isShared: false, balance: 100 });
      const { wallet: sWallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const tx = await insertTx({
        userId: owner,
        walletId: pWallet._id.toString(),
        type: 'expense',
        amount: 40,
        date: new Date('2026-10-10'),
        title: 'Lunch',
      });

      const moveReq = req(`http://localhost:3000/api/v1/transactions/${tx._id.toString()}`, 'PUT', owner, {
        title: 'Lunch',
        amount: 40,
        type: 'expense',
        date: '2026-10-10',
        walletId: sWallet._id.toString(),
      });
      const moveRes = await v1.updateTransaction(moveReq, ctx(tx._id.toString()));
      expect(moveRes.status).toBe(400);
      const body = await moveRes.json();
      expect(body.error.fields?.walletId).toBe('Cannot move transaction between personal and shared wallets');
    });

    it('rejects GET /wallets/{personalWalletId}/transactions with 400', async () => {
      const pWallet = await Wallet.create({ userId: owner, name: 'Personal Wallet', isShared: false, balance: 100 });
      const txReq = req(`http://localhost:3000/api/v1/wallets/${pWallet._id.toString()}/transactions`, 'GET', owner);
      const txRes = await v1.listSharedWalletTransactions(txReq, ctx(pWallet._id.toString()));
      expect(txRes.status).toBe(400);
    });

    it('rejects GET /transactions/summary for shared wallet with 404', async () => {
      const { wallet: sWallet } = await seedSharedWallet(owner, [{ userId: member, status: 'accepted' }]);
      const sWalletId = sWallet._id.toString();
      await insertTx({
        userId: owner,
        walletId: sWalletId,
        type: 'expense',
        amount: 77,
        date: new Date('2026-10-10'),
        title: 'Dinner',
      });

      const sumReq = req(`http://localhost:3000/api/v1/transactions/summary?from=2026-10-01&to=2026-10-31&walletId=${sWalletId}`, 'GET', owner);
      const sumRes = await v1.transactionSummary(sumReq, ctx());
      expect(sumRes.status).toBe(404);
    });
  });
});
