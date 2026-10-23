import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Wallet from '@/server/db/models/Wallet';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import Scheduler from '@/server/db/models/Scheduler';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { TransactionRepository } from '../../transactions/repositories/TransactionRepository';
import { WalletRepository } from '../../wallets/repositories/WalletRepository';
import { CategoryRepository } from '../../categories/repositories/CategoryRepository';
import { CreateTransactionService } from '../../transactions/services/CreateTransactionService';
import { SchedulerRepository } from '../repositories/SchedulerRepository';
import { CreateSchedulerService } from '../services/CreateSchedulerService';
import { UpdateSchedulerService } from '../services/UpdateSchedulerService';
import { SetSchedulerStatusService } from '../services/SetSchedulerStatusService';
import { DeleteSchedulerService } from '../services/DeleteSchedulerService';
import { RunDueSchedulersService } from '../services/RunDueSchedulersService';
import type { SchedulerCommand } from '../services/rules';
import type { SchedulerState } from '@/server/shared/ports/schedulers';

let mongo: MongoMemoryReplSet;
const user = new mongoose.Types.ObjectId().toString();
const other = new mongoose.Types.ObjectId().toString();
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (x: Date | null | undefined) => x?.toISOString().slice(0, 10);
// 12:00 in Bangkok on 2026-10-10.
let clock = new Date('2026-10-10T05:00:00Z');
const now = () => clock;

const uow = new MongoUnitOfWork();
const repo = new SchedulerRepository();
const wallets = new WalletRepository();
const categories = new CategoryRepository();
const poster = new CreateTransactionService(new TransactionRepository(), wallets, categories, uow);
const create = new CreateSchedulerService(repo, wallets, categories, poster, uow, now);
const update = new UpdateSchedulerService(repo, wallets, categories, uow, now);
const setStatus = new SetSchedulerStatusService(repo, uow, now);
const remove = new DeleteSchedulerService(repo, uow);
const run = new RunDueSchedulersService(repo, wallets, poster, uow, now);

let walletId: string;
let othersId: string;
let foodId: string;
const cmd = (over: Partial<SchedulerCommand> = {}): SchedulerCommand => ({
  walletId, type: 'expense', amount: 100, title: 'YouTube Premium', startDate: d('2026-10-10'),
  frequency: 'monthly', interval: 1, end: { type: 'never' }, ...over,
});
// Seeds a Scheduler directly, e.g. one whose due date is already in the past (create never back-fills).
const seed = (over: Partial<SchedulerState> = {}) => uow.run(context => repo.create(user, {
  walletId, categoryId: othersId, type: 'expense', amount: 100, title: 'Seeded', startDate: d('2026-10-07'), anchorDay: 7,
  frequency: 'daily', interval: 1, end: { type: 'never' }, status: 'active', createdCount: 0, nextDueDate: d('2026-10-07'), ...over,
}, context));
const balance = async () => (await Wallet.findById(walletId))!.balance;
const txDates = async () => (await Transaction.find({ walletId }).sort({ date: 1 })).map(t => iso(t.date));

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Wallet.init(), Transaction.init(), Category.init(), Scheduler.init()]);
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  clock = new Date('2026-10-10T05:00:00Z');
  await Promise.all([Wallet.deleteMany({}), Transaction.collection.deleteMany({}), Category.deleteMany({}), Scheduler.collection.deleteMany({})]);
  walletId = String((await Wallet.create({ userId: user, name: 'Main' }))._id);
  othersId = String((await Category.create({ userId: user, name: 'Others', type: 'expense', isSystem: true }))._id);
  foodId = String((await Category.create({ userId: user, name: 'Food', type: 'expense' }))._id);
});

describe('create', () => {
  it('posts the first Transaction right away when the start date is today', async () => {
    const s = await create.execute(user, cmd());
    expect(s).toMatchObject({ createdCount: 1, status: 'active', categoryId: othersId });
    expect(iso(s.nextDueDate)).toBe('2026-11-10');
    expect(await txDates()).toEqual(['2026-10-10']);
    expect(await balance()).toBe(-100);
  });
  it('does not back-fill a past start date and waits for the next cycle', async () => {
    const s = await create.execute(user, cmd({ startDate: d('2026-10-05') }));
    expect(s.createdCount).toBe(0);
    expect(iso(s.nextDueDate)).toBe('2026-11-05');
    expect(await txDates()).toEqual([]);
  });
  it('turns a span into a fixed end date and rejects an end before the first run', async () => {
    const s = await create.execute(user, cmd({ startDate: d('2026-10-12'), end: { type: 'span', value: 5, unit: 'months' } }));
    expect(s.end).toMatchObject({ type: 'endDate' });
    expect(iso(s.end.endDate)).toBe('2027-03-12');
    await expect(create.execute(user, cmd({ startDate: d('2026-10-05'), end: { type: 'endDate', endDate: d('2026-10-20') } }))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
  it('rejects a category of the wrong type, a foreign wallet and the 50 scheduler cap', async () => {
    const income = String((await Category.create({ userId: user, name: 'Salary', type: 'income' }))._id);
    await expect(create.execute(user, cmd({ categoryId: income }))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(create.execute(other, cmd())).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await Promise.all(Array.from({ length: 50 }, () => seed({ status: 'paused' })));
    await expect(create.execute(user, cmd({ categoryId: foodId }))).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  it('completes after N occurrences', async () => {
    const s = await create.execute(user, cmd({ frequency: 'daily', end: { type: 'count', count: 1 } }));
    expect(s).toMatchObject({ status: 'completed', nextDueDate: null, createdCount: 1 });
  });
});

describe('daily job', () => {
  it('catches up missed days with their original dates and allows a negative balance', async () => {
    await seed({ nextDueDate: d('2026-10-07') });
    expect(await run.execute()).toMatchObject({ posted: 4, failed: 0 });
    expect(await txDates()).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
    expect(await balance()).toBe(-400);
    expect(iso((await repo.list(user))[0].nextDueDate)).toBe('2026-10-11');
  });
  it('is idempotent across repeated and concurrent runs', async () => {
    await seed();
    await Promise.all([run.execute(), run.execute()]);
    await run.execute();
    expect(await txDates()).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
  });
  it('completes on the end date and skips paused schedulers', async () => {
    await seed({ end: { type: 'endDate', endDate: d('2026-10-08') } });
    await seed({ status: 'paused' });
    await run.execute();
    expect(await txDates()).toEqual(['2026-10-07', '2026-10-08']);
    expect((await repo.list(user)).map(s => s.status).sort()).toEqual(['completed', 'paused']);
  });
  it('cancels for good when the Creator can no longer use the wallet', async () => {
    await seed();
    await Wallet.collection.deleteMany({});
    expect(await run.execute()).toMatchObject({ cancelled: 1, posted: 0 });
    expect(await repo.list(user)).toMatchObject([{ status: 'cancelled', nextDueDate: null }]);
    expect(await Transaction.countDocuments()).toBe(0);
  });
});

describe('pause, resume, edit, delete', () => {
  it('pauses, then resume skips the paused period', async () => {
    const s = await seed({ frequency: 'monthly', anchorDay: 5, startDate: d('2026-08-05'), nextDueDate: d('2026-11-05') });
    clock = new Date('2026-10-10T05:00:00Z');
    const paused = await setStatus.execute(s.id, user, 'pause');
    expect(paused.status).toBe('paused');
    await expect(setStatus.execute(s.id, user, 'pause')).rejects.toMatchObject({ code: 'CONFLICT' });
    clock = new Date('2026-12-20T05:00:00Z');
    const resumed = await setStatus.execute(s.id, user, 'resume');
    expect(resumed.status).toBe('active');
    expect(iso(resumed.nextDueDate)).toBe('2027-01-05');
    expect(await txDates()).toEqual([]);
  });
  it('edits forward only and rejects completed or foreign schedulers', async () => {
    const s = await create.execute(user, cmd());
    const edited = await update.execute(s.id, user, cmd({ amount: 150, categoryId: foodId }));
    expect(edited).toMatchObject({ amount: 150, categoryId: foodId, createdCount: 1 });
    expect(iso(edited.nextDueDate)).toBe('2026-11-10');
    expect((await Transaction.findOne({ walletId }))!.amount).toBe(100);
    const recomputed = await update.execute(s.id, user, cmd({ frequency: 'weekly', startDate: d('2026-10-17') }));
    expect(iso(recomputed.nextDueDate)).toBe('2026-10-17');
    const done = await update.execute(s.id, user, cmd({ end: { type: 'count', count: 1 } }));
    expect(done.status).toBe('completed');
    await expect(update.execute(s.id, user, cmd())).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(update.execute(s.id, other, cmd())).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('deletes the Scheduler but keeps the Transactions it created', async () => {
    const s = await create.execute(user, cmd());
    await expect(remove.execute(s.id, other)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await remove.execute(s.id, user);
    expect(await repo.list(user)).toEqual([]);
    expect(await Transaction.countDocuments()).toBe(1);
  });
});
