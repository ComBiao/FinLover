import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Wallet from '@/server/db/models/Wallet';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import Scheduler from '@/server/db/models/Scheduler';
import User from '@/server/db/models/User';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { seedUser } from '@/test/user-fixture';
vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));
import { deleteCategoryService, deleteWalletService } from '@/server/composition';
import { SchedulerRepository } from '../repositories/SchedulerRepository';
import { UserRepository } from '../../users/repositories/UserRepository';
import type { SchedulerState } from '@/server/shared/ports/schedulers';

let mongo: MongoMemoryReplSet;
const uow = new MongoUnitOfWork();
const repo = new SchedulerRepository();
const user = new mongoose.Types.ObjectId().toString();
const member = new mongoose.Types.ObjectId().toString();
let walletA: string, walletB: string, others: string, food: string;

const seed = (userId: string, walletId: string, categoryId: string, over: Partial<SchedulerState> = {}) => uow.run(context => repo.create(userId, {
  walletId, categoryId, type: 'expense', amount: 10, title: 'Seed', startDate: new Date('2026-10-01'), anchorDay: 1,
  frequency: 'monthly', interval: 1, end: { type: 'never' }, status: 'active', createdCount: 0, nextDueDate: new Date('2026-11-01'), ...over,
}, context));

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Wallet.init(), Category.init(), Transaction.init(), Scheduler.init(), User.init()]);
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  await Promise.all([Wallet.deleteMany({}), Category.deleteMany({}), Transaction.collection.deleteMany({}), Scheduler.collection.deleteMany({}), User.deleteMany({})]);
  await seedUser(user);
  walletA = String((await Wallet.create({ userId: user, name: 'A' }))._id);
  walletB = String((await Wallet.create({ userId: user, name: 'B' }))._id);
  others = String((await Category.create({ userId: user, name: 'Others', type: 'expense', isSystem: true }))._id);
  food = String((await Category.create({ userId: user, name: 'Food', type: 'expense' }))._id);
});

describe('Scheduler cascades', () => {
  it('deleting a wallet deletes its Schedulers only', async () => {
    await seed(user, walletA, food);
    await seed(user, walletB, food);
    await deleteWalletService.execute(walletA, user);
    expect((await repo.list(user)).map(s => s.walletId)).toEqual([walletB]);
  });
  it('deleting a category moves its Schedulers to Others without touching balances', async () => {
    await seed(user, walletA, food);
    await deleteCategoryService.execute(food, user);
    expect(await repo.list(user)).toMatchObject([{ categoryId: others, status: 'active' }]);
    expect((await Wallet.findById(walletA))!.balance).toBe(0);
  });
  it('deleting the account removes its Schedulers and those posting to its wallets', async () => {
    await seed(user, walletA, food);
    await seed(member, walletA, food); // e.g. a shared-wallet member's Scheduler on this user's wallet
    const survivorWallet = new mongoose.Types.ObjectId().toString();
    await seed(member, survivorWallet, food);
    await uow.run(context => new UserRepository().deleteById(user, context));
    expect(await Scheduler.countDocuments()).toBe(1);
    expect((await repo.list(member))[0].walletId).toBe(survivorWallet);
  });
  it('cancels a Creator\'s open Schedulers on one wallet for good', async () => {
    const mine = await seed(user, walletA, food);
    const paused = await seed(user, walletA, food, { status: 'paused' });
    const elsewhere = await seed(user, walletB, food);
    const theirs = await seed(member, walletA, food);
    await uow.run(context => repo.cancelByCreatorAndWallet(user, walletA, context));
    const status = async (id: string, userId: string) => (await repo.findOwned(id, userId))!.status;
    expect([await status(mine.id, user), await status(paused.id, user)]).toEqual(['cancelled', 'cancelled']);
    expect(await status(elsewhere.id, user)).toBe('active');
    expect(await status(theirs.id, member)).toBe('active');
    expect((await repo.findOwned(mine.id, user))!.nextDueDate).toBeNull();
  });
});
