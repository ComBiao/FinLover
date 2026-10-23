import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import Scheduler from '../Scheduler';

const id = () => new mongoose.Types.ObjectId();
const valid = () => ({
  userId: id(), walletId: id(), categoryId: id(), type: 'expense', amount: 10, title: 'YouTube Premium',
  startDate: new Date('2026-10-23'), anchorDay: 23, frequency: 'monthly', interval: 1, nextDueDate: new Date('2026-10-23'),
});

describe('Scheduler model', () => {
  it('accepts a valid document with defaults', () => {
    const doc = new Scheduler(valid());
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.status).toBe('active');
    expect(doc.endType).toBe('never');
    expect(doc.createdCount).toBe(0);
  });
  it('requires a category and nextDueDate while active', () => {
    const rest: Record<string, unknown> = valid();
    delete rest.categoryId;
    delete rest.nextDueDate;
    const error = new Scheduler(rest).validateSync();
    expect(error?.errors.categoryId).toBeDefined();
    expect(error?.errors.nextDueDate).toBeDefined();
  });
  it('allows a null nextDueDate once completed', () => {
    expect(new Scheduler({ ...valid(), status: 'completed', nextDueDate: null }).validateSync()).toBeUndefined();
  });
  it('rejects an interval above the frequency maximum', () => {
    expect(new Scheduler({ ...valid(), frequency: 'yearly', interval: 6 }).validateSync()?.errors.interval).toBeDefined();
  });
  it('rejects unguarded writes', async () => {
    await expect(new Scheduler(valid()).save()).rejects.toThrow('UnitOfWork');
  });
});
