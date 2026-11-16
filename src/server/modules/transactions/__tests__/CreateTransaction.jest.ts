/**
 * Unit tests — add-transaction flow on the layered backend
 *
 * Tool : Jest 30 (babel-jest + @babel/preset-typescript)
 * Goal : 100 % statement coverage of
 *          - CreateTransactionController (parsing, validation, DTO choice, error mapping)
 *          - CreateTransactionService    (wallet/category rules, personal vs shared wallet, balance)
 *
 * Design: the service receives every dependency through its constructor, so it is tested
 * with hand-written fakes — no jest.mock for mongoose or models. Only connectDB (controller)
 * and the logger are mocked. Auth (old Paths 1-4) is handled by secure() in policy.ts and is
 * already covered by shared/http/__tests__/policy.test.ts, so it is not repeated here.
 *
 * File name ends in .jest.ts (not .test.ts) so Vitest does not pick it up.
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';

import { connectDB } from '@/server/db/index';
import { CreateTransactionController } from '@/server/modules/transactions/controllers/CreateTransactionController';
import { CreateTransactionService } from '@/server/modules/transactions/services/CreateTransactionService';
import { AppError } from '@/server/shared/kernel/AppError';
import type { RouteContext } from '@/server/shared/http/policy';
import type {
  TransactionInput,
  TransactionRecord,
  TransactionRepositoryPort,
} from '@/server/shared/ports/transactions';
import type { TransactionContext, UnitOfWork } from '@/server/shared/ports/unit-of-work';

// babel-jest hoists these above the imports.
jest.mock('@/server/db/index', () => ({ connectDB: jest.fn() }));
jest.mock('@/server/shared/http/logging', () => ({ logError: jest.fn() }));

// ─── Shared constants / helpers ────────────────────────────────────────────

const USER_ID = 'user-1';
const WALLET_ID = 'a'.repeat(24); // valid 24-char hex ObjectId
const CAT_ID = 'c'.repeat(24);

type Json = {
  error?: { code: string; message: string; fields?: Record<string, string> };
  data?: Record<string, unknown>;
};

const record = (over: Partial<TransactionRecord> = {}): TransactionRecord => ({
  id: 'tx1',
  walletId: WALLET_ID,
  userId: USER_ID,
  type: 'expense',
  amount: 10,
  date: new Date('2026-11-16T00:00:00.000Z'),
  title: 'Lunch',
  ...over,
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

describe('CreateTransactionController.handle', () => {
  const execute = jest.fn<(userId: string, input: TransactionInput) => Promise<TransactionRecord>>();
  const controller = new CreateTransactionController({ execute } as unknown as CreateTransactionService);
  const context = {
    params: Promise.resolve({ id: '' }),
    principal: { userId: USER_ID },
  } as unknown as RouteContext;

  const validBody = {
    wallet_id: WALLET_ID,
    type: 'Expense',
    amount: 10,
    date: '2026-11-16',
    title: 'Lunch',
  };

  function request(body: unknown, raw?: string) {
    return new Request('http://localhost/api/transaction', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw ?? JSON.stringify(body),
    });
  }

  async function call(body: unknown, raw?: string) {
    const res = await controller.handle(request(body, raw), context);
    return { status: res.status, json: (await res.json()) as Json };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(connectDB).mockResolvedValue(mongoose);
  });

  test('Path 1 : begin → body is not valid JSON → 400 INVALID_JSON', async () => {
    const { status, json } = await call(undefined, '{not json');

    expect(status).toBe(400);
    expect(json).toMatchObject({ error: { code: 'INVALID_JSON' } });
    expect(execute).not.toHaveBeenCalled();
  });

  test('Path 2 : begin → body fails the Zod schema → 422 VALIDATION_ERROR', async () => {
    const { status, json } = await call({ type: 'Unknown', amount: -1 });

    expect(status).toBe(422);
    expect(json.error?.code).toBe('VALIDATION_ERROR');
    expect(json.error?.message).toBe('One or more fields are invalid');
    expect(json.error?.fields).toHaveProperty('wallet_id');
    expect(json.error?.fields).toHaveProperty('type');
    expect(json.error?.fields).toHaveProperty('amount');
    expect(json.error?.fields).toHaveProperty('date');
    expect(json.error?.fields).toHaveProperty('title');
    expect(execute).not.toHaveBeenCalled();
  });

  test('Path 3 : begin → valid body, no category → service called with mapped input → 201 (legacy shape)', async () => {
    execute.mockResolvedValue(record());

    const { status, json } = await call(validBody);

    expect(status).toBe(201);
    expect(execute).toHaveBeenCalledWith(USER_ID, {
      walletId: WALLET_ID,
      categoryId: null, // omitted category_id becomes null
      categoryKey: undefined,
      type: 'expense', // "Expense" is lower-cased
      amount: 10,
      date: new Date('2026-11-16'),
      title: 'Lunch',
      note: undefined,
    });
    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(json).toEqual({
      data: {
        id: 'tx1',
        wallet_id: WALLET_ID,
        category_id: null,
        type: 'expense',
        amount: 10,
        date: '2026-11-16',
        title: 'Lunch',
      },
    });
  });

  test('Path 4 : begin → valid body with category + note → 201 (legacy shape keeps category_id)', async () => {
    execute.mockResolvedValue(record({ type: 'income', amount: 2000, categoryId: CAT_ID, note: 'Salary' }));

    const { status, json } = await call({
      ...validBody,
      type: 'Income',
      amount: 2000,
      category_id: CAT_ID,
      note: 'Salary',
    });

    expect(status).toBe(201);
    expect(execute).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ categoryId: CAT_ID, type: 'income', note: 'Salary' }),
    );
    expect(json.data).toMatchObject({ category_id: CAT_ID, type: 'income', amount: 2000, note: 'Salary' });
  });

  test('Path 5 : begin → service returns a shared-wallet row (createdBy set) → 201 (shared shape)', async () => {
    execute.mockResolvedValue(
      record({
        type: 'income',
        amount: 2000,
        categoryKey: 'salary',
        createdBy: { id: USER_ID, name: 'Mali' },
      }),
    );

    const { status, json } = await call({ ...validBody, type: 'Income', amount: 2000, category_key: 'salary' });

    expect(status).toBe(201);
    expect(json).toEqual({
      data: {
        id: 'tx1',
        walletId: WALLET_ID,
        type: 'income',
        amount: 2000,
        date: '2026-11-16',
        title: 'Lunch',
        createdBy: { id: USER_ID, name: 'Mali' },
        category: { key: 'salary', name: 'Salary', icon: 'Wallet', color: '#16A34A' },
      },
    });
  });

  test('Path 6 : begin → service throws AppError NOT_FOUND → 404', async () => {
    execute.mockRejectedValue(new AppError('NOT_FOUND', 'Wallet not found'));

    const { status, json } = await call(validBody);

    expect(status).toBe(404);
    expect(json).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Wallet not found' } });
  });

  test('Path 7 : begin → service throws AppError FORBIDDEN → 403', async () => {
    execute.mockRejectedValue(new AppError('FORBIDDEN', 'Only wallet members can access this wallet'));

    const { status, json } = await call(validBody);

    expect(status).toBe(403);
    expect(json).toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  test('Path 8 : begin → service throws AppError VALIDATION_ERROR → 422 with fields', async () => {
    execute.mockRejectedValue(
      new AppError('VALIDATION_ERROR', 'One or more fields are invalid', {
        categoryId: 'Referenced category does not exist or type mismatch',
      }),
    );

    const { status, json } = await call(validBody);

    expect(status).toBe(422);
    expect(json).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        fields: { categoryId: 'Referenced category does not exist or type mismatch' },
      },
    });
  });

  test('Path 9 : begin → service throws Mongoose ValidationError → 422 with field messages', async () => {
    const valErr = new mongoose.Error.ValidationError();
    valErr.errors = {
      amount: new mongoose.Error.ValidatorError({ message: 'Amount must be at least 0.01', path: 'amount' }),
    };
    execute.mockRejectedValue(valErr);

    const { status, json } = await call(validBody);

    expect(status).toBe(422);
    expect(json).toMatchObject({
      error: { code: 'VALIDATION_ERROR', fields: { amount: 'Amount must be at least 0.01' } },
    });
  });

  test('Path 10 : begin → service throws unexpected error → 500 INTERNAL_ERROR', async () => {
    execute.mockRejectedValue(new Error('DB connection lost'));

    const { status, json } = await call(validBody);

    expect(status).toBe(500);
    expect(json).toMatchObject({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });

  test('Path 11 : begin → connectDB rejects → 500 INTERNAL_ERROR (service never called)', async () => {
    jest.mocked(connectDB).mockRejectedValue(new Error('cannot connect'));

    const { status, json } = await call(validBody);

    expect(status).toBe(500);
    expect(json).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
    expect(execute).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

describe('CreateTransactionService.execute', () => {
  const ctx = {} as TransactionContext;
  // Fake UnitOfWork: just run the callback with a dummy context.
  const uow = {
    run: <T>(fn: (c: TransactionContext) => Promise<T>) => fn(ctx),
  } as unknown as UnitOfWork;

  const baseInput: TransactionInput = {
    walletId: WALLET_ID,
    type: 'expense',
    amount: 10,
    date: new Date('2026-11-16T00:00:00.000Z'),
    title: 'Lunch',
  };

  const walletDoc = (over: Record<string, unknown> = {}) => ({
    id: WALLET_ID,
    userId: USER_ID,
    isShared: false,
    ...over,
  });

  /** Builds the service with fakes. Flags drop an optional dependency to reach its "missing" branch. */
  function setup(opts: { memberships?: boolean; users?: boolean; findById?: boolean } = {}) {
    const { memberships: withMemberships = true, users: withUsers = true, findById: withFindById = true } = opts;

    const create = jest
      .fn<(userId: string, input: TransactionInput, c: TransactionContext) => Promise<TransactionRecord>>()
      .mockImplementation(async (userId, input) => ({
        ...input,
        id: 'tx1',
        userId,
        walletId: input.walletId as string,
      }));
    const findById = jest.fn<(id: string, c?: TransactionContext) => Promise<unknown>>();
    const adjust = jest
      .fn<(id: string, userId: string, delta: number, c: TransactionContext) => Promise<void>>()
      .mockResolvedValue(undefined);
    const typeOf = jest.fn<(id: string, userId: string, c: TransactionContext) => Promise<string | null>>();
    const roleOf = jest.fn<(walletId: string, userId: string, c: TransactionContext) => Promise<string | null>>();
    const findPublicByIds = jest
      .fn<(ids: string[], c: TransactionContext) => Promise<{ id: string; name: string }[]>>()
      .mockResolvedValue([{ id: USER_ID, name: 'Mali' }]);

    const service = new CreateTransactionService(
      { create } as unknown as TransactionRepositoryPort,
      (withFindById ? { findById, adjust } : { adjust }) as never,
      { typeOf } as never,
      uow,
      withMemberships ? ({ roleOf } as never) : undefined,
      withUsers ? ({ findPublicByIds } as never) : undefined,
    );
    return { service, create, findById, adjust, typeOf, roleOf, findPublicByIds };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Wallet lookup ────────────────────────────────────────────────────────

  for (const [label, walletId] of [
    ['missing', undefined],
    ['malformed', 'not-valid'],
  ] as const) {
    test(`Path 1 (${label}) : begin → walletId ${label} → VALIDATION_ERROR on wallet_id`, async () => {
      const { service, findById } = setup();

      await expect(service.execute(USER_ID, { ...baseInput, walletId })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: { wallet_id: 'must be a valid ObjectId' },
      });
      expect(findById).not.toHaveBeenCalled();
    });
  }

  test('Path 2 : begin → valid walletId → wallet not found → NOT_FOUND', async () => {
    const { service, findById, create } = setup();
    findById.mockResolvedValue(null);

    await expect(service.execute(USER_ID, baseInput)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Wallet not found',
    });
    expect(create).not.toHaveBeenCalled();
  });

  test('Path 3 : begin → wallet access has no findById → NOT_FOUND', async () => {
    const { service } = setup({ findById: false });

    await expect(service.execute(USER_ID, baseInput)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // ── Shared wallet ────────────────────────────────────────────────────────

  describe('shared wallet', () => {
    const sharedWallet = walletDoc({ isShared: true, userId: 'owner-1' });

    test('Path 4 : begin → shared wallet → no membership port → FORBIDDEN', async () => {
      const { service, findById, create } = setup({ memberships: false });
      findById.mockResolvedValue(sharedWallet);

      await expect(service.execute(USER_ID, baseInput)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(create).not.toHaveBeenCalled();
    });

    test('Path 5 : begin → shared wallet → caller is not a member → FORBIDDEN', async () => {
      const { service, findById, roleOf, create } = setup();
      findById.mockResolvedValue(sharedWallet);
      roleOf.mockResolvedValue(null);

      await expect(service.execute(USER_ID, baseInput)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(roleOf).toHaveBeenCalledWith(WALLET_ID, USER_ID, ctx);
      expect(create).not.toHaveBeenCalled();
    });

    test('Path 6 : begin → shared wallet → member sends a categoryId → VALIDATION_ERROR', async () => {
      const { service, findById, roleOf, create } = setup();
      findById.mockResolvedValue(sharedWallet);
      roleOf.mockResolvedValue('contributor');

      await expect(service.execute(USER_ID, { ...baseInput, categoryId: CAT_ID })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: { categoryId: 'Category is not allowed for shared wallets' },
      });
      expect(create).not.toHaveBeenCalled();
    });

    test('Path 7 : begin → shared wallet → invalid categoryKey for the type → VALIDATION_ERROR', async () => {
      const { service, findById, roleOf } = setup();
      findById.mockResolvedValue(sharedWallet);
      roleOf.mockResolvedValue('contributor');

      // "salary" is an income preset, the transaction is an expense
      await expect(service.execute(USER_ID, { ...baseInput, categoryKey: 'salary' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: { categoryKey: 'Category does not exist or does not match the transaction type' },
      });
    });

    test('Path 8 : begin → shared wallet → member, no category → default "others" key, createdBy set, balance adjusted', async () => {
      const { service, findById, roleOf, create, adjust, findPublicByIds } = setup();
      findById.mockResolvedValue(sharedWallet);
      roleOf.mockResolvedValue('contributor');

      const tx = await service.execute(USER_ID, baseInput);

      expect(create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ categoryId: null, categoryKey: 'others-expense' }),
        ctx,
      );
      expect(adjust).toHaveBeenCalledWith(WALLET_ID, USER_ID, -10, ctx);
      expect(findPublicByIds).toHaveBeenCalledWith([USER_ID], ctx);
      expect(tx.createdBy).toEqual({ id: USER_ID, name: 'Mali' });
    });

    for (const emptyCategory of [null, ''] as const) {
      test(`Path 9 (${JSON.stringify(emptyCategory)}) : begin → shared wallet → empty categoryId is allowed → created`, async () => {
        const { service, findById, roleOf, create } = setup();
        findById.mockResolvedValue(sharedWallet);
        roleOf.mockResolvedValue('contributor');

        await service.execute(USER_ID, { ...baseInput, categoryId: emptyCategory });

        expect(create).toHaveBeenCalledTimes(1);
      });
    }

    test('Path 10 : begin → shared wallet → explicit valid categoryKey is kept, income adds to balance', async () => {
      const { service, findById, roleOf, create, adjust } = setup();
      findById.mockResolvedValue(sharedWallet);
      roleOf.mockResolvedValue('owner');

      await service.execute(USER_ID, { ...baseInput, type: 'income', amount: 2000, categoryKey: 'salary' });

      expect(create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ categoryKey: 'salary', categoryId: null }),
        ctx,
      );
      expect(adjust).toHaveBeenCalledWith(WALLET_ID, USER_ID, 2000, ctx);
    });

    test('Path 11 : begin → shared wallet → null categoryKey falls back to the type\'s "others"', async () => {
      const { service, findById, roleOf, create } = setup();
      findById.mockResolvedValue(sharedWallet);
      roleOf.mockResolvedValue('contributor');

      await service.execute(USER_ID, { ...baseInput, type: 'income', categoryKey: null });

      expect(create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ categoryKey: 'others-income' }),
        ctx,
      );
    });

    test('Path 12 : begin → shared wallet → user lookup returns nobody → author is "Unnamed user"', async () => {
      const { service, findById, roleOf, findPublicByIds } = setup();
      findById.mockResolvedValue(sharedWallet);
      roleOf.mockResolvedValue('contributor');
      findPublicByIds.mockResolvedValue([]);

      const tx = await service.execute(USER_ID, baseInput);

      expect(tx.createdBy).toEqual({ id: USER_ID, name: 'Unnamed user' });
    });

    test('Path 13 : begin → shared wallet → no user directory port → created without createdBy', async () => {
      const { service, findById, roleOf } = setup({ users: false });
      findById.mockResolvedValue(sharedWallet);
      roleOf.mockResolvedValue('contributor');

      const tx = await service.execute(USER_ID, baseInput);

      expect(tx.createdBy).toBeUndefined();
    });
  });

  // ── Personal wallet ──────────────────────────────────────────────────────

  describe('personal wallet', () => {
    test('Path 14 : begin → personal wallet owned by someone else → NOT_FOUND', async () => {
      const { service, findById, create } = setup();
      findById.mockResolvedValue(walletDoc({ userId: 'other-user' }));

      await expect(service.execute(USER_ID, baseInput)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(create).not.toHaveBeenCalled();
    });

    test('Path 15 : begin → personal wallet → categoryKey sent → VALIDATION_ERROR', async () => {
      const { service, findById, create } = setup();
      findById.mockResolvedValue(walletDoc());

      await expect(service.execute(USER_ID, { ...baseInput, categoryKey: 'food-drinks' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: { categoryKey: 'Category key is only allowed for shared wallets' },
      });
      expect(create).not.toHaveBeenCalled();
    });

    test('Path 16 : begin → personal wallet → malformed categoryId → VALIDATION_ERROR (no lookup)', async () => {
      const { service, findById, typeOf } = setup();
      findById.mockResolvedValue(walletDoc());

      await expect(service.execute(USER_ID, { ...baseInput, categoryId: 'nope' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: { categoryId: 'Referenced category does not exist or type mismatch' },
      });
      expect(typeOf).not.toHaveBeenCalled();
    });

    for (const [label, foundType] of [
      ['does not exist', null],
      ['has a different type', 'income'],
    ] as const) {
      test(`Path 17 (${label}) : begin → personal wallet → category ${label} → VALIDATION_ERROR`, async () => {
        const { service, findById, typeOf, create } = setup();
        findById.mockResolvedValue(walletDoc());
        typeOf.mockResolvedValue(foundType);

        await expect(service.execute(USER_ID, { ...baseInput, categoryId: CAT_ID })).rejects.toMatchObject({
          code: 'VALIDATION_ERROR',
          fields: { categoryId: 'Referenced category does not exist or type mismatch' },
        });
        expect(typeOf).toHaveBeenCalledWith(CAT_ID, USER_ID, ctx);
        expect(create).not.toHaveBeenCalled();
      });
    }

    test('Path 18 : begin → personal wallet → category type matches → created, expense subtracts from balance', async () => {
      const { service, findById, typeOf, create, adjust } = setup();
      findById.mockResolvedValue(walletDoc());
      typeOf.mockResolvedValue('expense');

      const tx = await service.execute(USER_ID, { ...baseInput, categoryId: CAT_ID });

      expect(create).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ categoryId: CAT_ID }), ctx);
      expect(adjust).toHaveBeenCalledWith(WALLET_ID, USER_ID, -10, ctx);
      expect(tx).toMatchObject({ id: 'tx1', walletId: WALLET_ID, userId: USER_ID });
    });

    test('Path 19 : begin → personal wallet → no category → created, income adds to balance', async () => {
      const { service, findById, typeOf, create, adjust } = setup();
      findById.mockResolvedValue(walletDoc());

      await service.execute(USER_ID, { ...baseInput, type: 'income', amount: 2000 });

      expect(typeOf).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledTimes(1);
      expect(adjust).toHaveBeenCalledWith(WALLET_ID, USER_ID, 2000, ctx);
    });
  });
});