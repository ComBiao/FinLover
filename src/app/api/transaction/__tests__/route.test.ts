/**
 * Unit tests — POST /api/transaction  (addTransaction)
 *
 * Tool  : Jest 30 (via babel-jest + @babel/preset-typescript)
 * Goal  : 100 % statement coverage of src/app/api/transaction/route.ts
 *
 * Naming convention mirrors the user-provided triangle.js example:
 *   test("Path<N> : begin-...-end", () => { ... })
 */

// ─── Mock factories — declared before any imports ─────────────────────────
const mockWalletFindOne    = jest.fn();
const mockTransactionCreate = jest.fn();

// ─── Module mocks ─────────────────────────────────────────────────────────

// 1. Database — no-op
jest.mock('@/lib/db', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }));

// 2. Auth helper — controlled per-test
jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));

// 3. Silence side-effect model imports
jest.mock('@/models/Transaction', () => ({}));
jest.mock('@/models/Category',    () => ({}));
jest.mock('@/models/Wallet',      () => ({}));

// 4. Mongoose — keep real Types/Error classes, mock only model()
jest.mock('mongoose', () => {
  const actual = jest.requireActual<typeof import('mongoose')>('mongoose');
  const mockModel: jest.Mock = jest.fn((name: string) => {
    if (name === 'Wallet')      return { findOne: mockWalletFindOne };
    if (name === 'Transaction') return { create: mockTransactionCreate };
    return {};
  });

  // The route does:  import mongoose from 'mongoose'
  // babel-jest CJS interop resolves that to actual.default (which IS the
  // Mongoose singleton).  We must patch .model on BOTH the top-level
  // export AND .default so either interop path finds the mock.
  const patched = { ...actual, model: mockModel as unknown as typeof actual.model };
  patched.default = { ...actual.default, model: mockModel as unknown as typeof actual.model };

  return patched;
});

// ─── Imports (after all mocks) ─────────────────────────────────────────────
import jwt      from 'jsonwebtoken';
import mongoose from 'mongoose';
import { POST } from '../route';
import { verifyToken } from '@/lib/auth';

// ─── Shared helpers ────────────────────────────────────────────────────────

function makeRequest(body: unknown, authHeader?: string | null) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authHeader !== null && authHeader !== undefined) {
    headers['authorization'] = authHeader;
  }
  return new Request('http://localhost/api/transaction', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_USER_ID   = 'user-abc123';
const VALID_WALLET_ID = new mongoose.Types.ObjectId().toHexString();
const VALID_CAT_ID    = new mongoose.Types.ObjectId().toHexString();

// ─── Test suite ────────────────────────────────────────────────────────────

describe('POST /api/transaction — addTransaction', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // =========================================================================
  // 1. Authentication — lines 24-45
  // =========================================================================

  test('Path 1 : begin → authHeader missing → 401', async () => {
    const res  = await POST(makeRequest({}, null));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' },
    });
  });

  test('Path 2 : begin → authHeader not Bearer → 401', async () => {
    const res  = await POST(makeRequest({}, 'Basic dXNlcjpwYXNz'));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' },
    });
  });

  test('Path 3 : begin → Bearer token → JsonWebTokenError → 401', async () => {
    (verifyToken as jest.Mock).mockImplementation(() => {
      throw new jwt.JsonWebTokenError('invalid signature');
    });

    const res  = await POST(makeRequest({}, 'Bearer bad-token'));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  });

  test('Path 4 : begin → Bearer token → non-JWT error thrown → 500', async () => {
    (verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('crypto module crashed');
    });

    const res  = await POST(makeRequest({}, 'Bearer any-token'));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create transaction', fields: {} },
    });
  });

  // =========================================================================
  // 2. Schema / field Validation — lines 55-82
  // =========================================================================

  test('Path 5 : begin → valid auth → Zod failure → 422 VALIDATION_ERROR', async () => {
    (verifyToken as jest.Mock).mockReturnValue({ userId: VALID_USER_ID });

    const res  = await POST(makeRequest({ type: 'Unknown', amount: -1 }, 'Bearer tok'));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('One or more fields are invalid');
    expect(json.error.fields).toHaveProperty('wallet_id');
    expect(json.error.fields).toHaveProperty('type');
    expect(json.error.fields).toHaveProperty('amount');
    expect(json.error.fields).toHaveProperty('date');
  });

  test('Path 5b : begin → valid auth → Zod root-level error → fields["root"] fallback branch (line 60)', async () => {
    // Send completely invalid JSON structure — Zod will emit an issue with an empty path[]
    // triggering the `|| 'root'` branch on line 60.
    (verifyToken as jest.Mock).mockReturnValue({ userId: VALID_USER_ID });

    // Pass a non-object body; Zod parses it and produces a root-level issue
    const res  = await POST(makeRequest(null, 'Bearer tok'));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    // The root-level issue is mapped to the key 'root'
    expect(json.error.fields).toHaveProperty('root');
  });

  test('Path 6 : begin → valid auth → invalid ObjectId → 422 VALIDATION_ERROR', async () => {
    (verifyToken as jest.Mock).mockReturnValue({ userId: VALID_USER_ID });

    const res  = await POST(makeRequest(
      { wallet_id: 'not-valid', type: 'Expense', amount: 50, date: '2026-11-16' },
      'Bearer tok',
    ));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields are invalid',
        fields: { wallet_id: 'must be a valid ObjectId' },
      },
    });
  });

  test('Path 7 : begin → valid auth → valid ObjectId → Wallet not found → 404', async () => {
    (verifyToken as jest.Mock).mockReturnValue({ userId: VALID_USER_ID });
    mockWalletFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const res  = await POST(makeRequest(
      { wallet_id: VALID_WALLET_ID, type: 'Expense', amount: 50, date: '2026-11-16' },
      'Bearer tok',
    ));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({
      error: { code: 'NOT_FOUND', message: 'Wallet not found' },
    });
    expect(mockWalletFindOne).toHaveBeenCalledWith({ _id: VALID_WALLET_ID, userId: VALID_USER_ID });
  });

  // =========================================================================
  // 3. Successful creation — lines 92-115
  // =========================================================================

  test('Path 8 : begin → valid auth → wallet found → create with category → 201', async () => {
    (verifyToken as jest.Mock).mockReturnValue({ userId: VALID_USER_ID });
    mockWalletFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: VALID_WALLET_ID, userId: VALID_USER_ID }),
    });

    const docId = new mongoose.Types.ObjectId();
    mockTransactionCreate.mockResolvedValue({
      _id:        docId,
      walletId:   new mongoose.Types.ObjectId(VALID_WALLET_ID),
      categoryId: new mongoose.Types.ObjectId(VALID_CAT_ID),
      type:       'Expense',
      amount:     { toString: () => '99.99' },
      date:       new Date('2026-11-16T00:00:00.000Z'),
      note:       'Team lunch',
    });

    const res  = await POST(makeRequest({
      wallet_id:   VALID_WALLET_ID,
      category_id: VALID_CAT_ID,
      type:        'Expense',
      amount:      99.99,
      date:        '2026-11-16',
      note:        'Team lunch',
    }, 'Bearer tok'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual({
      data: {
        id:          docId.toString(),
        wallet_id:   VALID_WALLET_ID,
        category_id: VALID_CAT_ID,
        type:        'Expense',
        amount:      99.99,
        date:        '2026-11-16',
        note:        'Team lunch',
      },
    });
  });

  test('Path 9 : begin → valid auth → wallet found → create WITHOUT category → 201 (category_id: null)', async () => {
    (verifyToken as jest.Mock).mockReturnValue({ userId: VALID_USER_ID });
    mockWalletFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: VALID_WALLET_ID, userId: VALID_USER_ID }),
    });

    const docId = new mongoose.Types.ObjectId();
    mockTransactionCreate.mockResolvedValue({
      _id:        docId,
      walletId:   new mongoose.Types.ObjectId(VALID_WALLET_ID),
      categoryId: null,
      type:       'Income',
      amount:     { toString: () => '2000' },
      date:       new Date('2026-11-16T00:00:00.000Z'),
      note:       undefined,
    });

    const res  = await POST(makeRequest({
      wallet_id: VALID_WALLET_ID,
      type:      'Income',
      amount:    2000,
      date:      '2026-11-16',
    }, 'Bearer tok'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.category_id).toBeNull();
    expect(json.data.type).toBe('Income');
    expect(json.data.amount).toBe(2000);
    expect(mockTransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: null }),
    );
  });

  // =========================================================================
  // 4. Error handling — lines 117-147
  // =========================================================================

  const validBody = {
    wallet_id: VALID_WALLET_ID,
    type:      'Expense',
    amount:    10,
    date:      '2026-11-16',
  };

  function setupSuccessfulWallet() {
    (verifyToken as jest.Mock).mockReturnValue({ userId: VALID_USER_ID });
    mockWalletFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: VALID_WALLET_ID, userId: VALID_USER_ID }),
    });
  }

  test('Path 10 : begin → valid auth → wallet found → Mongoose ValidationError → 422', async () => {
    setupSuccessfulWallet();

    const valErr = new mongoose.Error.ValidationError();
    valErr.errors = {
      amount: new mongoose.Error.ValidatorError({ message: 'Amount must be positive', path: 'amount' }),
    };
    mockTransactionCreate.mockRejectedValue(valErr);

    const res  = await POST(makeRequest(validBody, 'Bearer tok'));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toEqual({
      error: {
        code:    'VALIDATION_ERROR',
        message: 'One or more fields are invalid',
        fields:  { amount: 'Amount must be positive' },
      },
    });
  });

  test('Path 11 : begin → valid auth → wallet found → "does not exist" error → 422', async () => {
    setupSuccessfulWallet();
    mockTransactionCreate.mockRejectedValue(new Error('Category abc does not exist'));

    const res  = await POST(makeRequest(validBody, 'Bearer tok'));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Category abc does not exist', fields: {} },
    });
  });

  test('Path 12 : begin → valid auth → wallet found → "does not match category type" error → 422', async () => {
    setupSuccessfulWallet();
    mockTransactionCreate.mockRejectedValue(
      new Error('Transaction type does not match category type'),
    );

    const res  = await POST(makeRequest(validBody, 'Bearer tok'));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toEqual({
      error: {
        code:    'VALIDATION_ERROR',
        message: 'Transaction type does not match category type',
        fields:  {},
      },
    });
  });

  test('Path 13 : begin → valid auth → wallet found → unexpected error → 500', async () => {
    setupSuccessfulWallet();
    mockTransactionCreate.mockRejectedValue(new Error('DB connection lost'));

    const res  = await POST(makeRequest(validBody, 'Bearer tok'));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create transaction', fields: {} },
    });
  });
});
