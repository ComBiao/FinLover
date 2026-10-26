import { describe, expect, it } from 'vitest';
import {
  walletResponse, transactionResponse, sharedWalletResponse, walletCreateInput,
  walletMemberResponse, walletInvitationInput, myInvitationsResponse,
  sharedTransactionInput, sharedTransactionUpdate, sharedTransactionResponse,
  sharedHomeSummaryResponse, invitationEmailError, SHARED_CATEGORY_PRESETS, sharedCategoryOf,
} from '../api';

const id = '507f1f77bcf86cd799439011';
const person = { id, name: 'Alex' };
const wallet = { id, name: 'Trip', balance: 0, isDefault: false, isSaving: false, createdAt: '2026-10-23T00:00:00.000Z', updatedAt: '2026-10-23T00:00:00.000Z' };
const tx = { walletId: id, type: 'expense', amount: 42, date: '2026-10-23', title: 'Lunch' };

describe('E7 contract-first compatibility and target payloads', () => {
  it('keeps current personal payloads unchanged without fabricating shared metadata', () => {
    expect(walletResponse.parse(wallet)).toEqual(wallet);
    const personal = { ...tx, id, categoryId: null };
    expect(transactionResponse.parse(personal)).toEqual(personal);
    expect(walletCreateInput.parse({ name: 'Trip', isShared: true, userId: id, balance: 100 })).toEqual({ name: 'Trip', isShared: true });
  });
  it('requires complete shared card metadata and limits avatars to three', () => {
    const shared = { ...wallet, isShared: true, role: 'owner', memberCount: 1, membersPreview: [person], ownerName: 'Alex' };
    expect(sharedWalletResponse.parse(shared)).toEqual(shared);
    expect(sharedWalletResponse.safeParse(wallet).success).toBe(false);
    expect(sharedWalletResponse.safeParse({ ...shared, memberCount: 0 }).success).toBe(false);
    expect(sharedWalletResponse.safeParse({ ...shared, membersPreview: Array(4).fill(person) }).success).toBe(false);
  });
  it('supports pending contributors but never pending owners', () => {
    const member = { userId: id, name: 'Alex', email: 'alex@example.com', role: 'contributor', status: 'pending' };
    expect(walletMemberResponse.parse(member)).toEqual(member);
    expect(walletMemberResponse.safeParse({ ...member, role: 'owner' }).success).toBe(false);
  });
  it('normalizes invitation email and validates the inbox and exact UI field errors', () => {
    expect(walletInvitationInput.parse({ email: ' Alex@Example.com ' })).toEqual({ email: 'alex@example.com' });
    expect(walletInvitationInput.safeParse({ email: 'invalid' }).success).toBe(false);
    const invitation = { id, walletId: id, walletName: 'Trip', invitedByName: 'Alex', createdAt: wallet.createdAt };
    expect(myInvitationsResponse.parse({ items: [invitation], total: 1 }).items).toEqual([invitation]);
    for (const email of ['User not found', 'Cannot invite yourself']) {
      expect(invitationEmailError.safeParse({ code: 'VALIDATION_ERROR', message: 'Validation failed', fields: { email } }).success).toBe(true);
    }
  });
  it('rejects categoryId including null, takes a preset categoryKey and disallows wallet moves on shared updates', () => {
    expect(sharedTransactionInput.parse(tx)).toEqual(tx);
    expect(sharedTransactionInput.parse({ ...tx, categoryKey: 'food-drinks' })).toEqual({ ...tx, categoryKey: 'food-drinks' });
    expect(sharedTransactionInput.parse({ ...tx, categoryKey: null }).categoryKey).toBeNull();
    expect(sharedTransactionInput.safeParse({ ...tx, categoryKey: 'my-own-category' }).success).toBe(false);
    for (const categoryId of [null, id]) {
      expect(sharedTransactionInput.safeParse({ ...tx, categoryId }).success).toBe(false);
    }
    const { walletId: omitted, ...update } = tx;
    expect(omitted).toBe(id);
    expect(sharedTransactionUpdate.parse(update)).toEqual(update);
    expect(sharedTransactionUpdate.safeParse(tx).success).toBe(false);
  });
  it('requires shared author attribution, accepts deleted users, and returns a preset category', () => {
    const shared = { ...tx, id, createdBy: person, editedBy: { id, name: 'Deleted user' }, category: { key: 'others-expense', name: 'Others', icon: 'MoreHorizontal', color: '#4B5563' } };
    expect(sharedTransactionResponse.parse(shared)).toEqual(shared);
    expect(sharedTransactionResponse.safeParse({ ...tx, id }).success).toBe(false);
    expect(sharedTransactionResponse.safeParse({ ...shared, category: undefined }).success).toBe(false);
    expect(sharedTransactionResponse.safeParse({ ...shared, categoryId: null }).success).toBe(false);
  });
  it('keeps the Home shape but requires a selected wallet and keyed shared top categories', () => {
    const summary = { month: '2026-10', walletId: id, balance: { hasWallets: true, totalBalance: 0, savingGoal: null }, income: 0, expense: 0, net: { net: 0, status: 'even' }, topCategories: [] };
    expect(sharedHomeSummaryResponse.parse(summary)).toEqual(summary);
    expect(sharedHomeSummaryResponse.safeParse({ ...summary, walletId: 'all' }).success).toBe(false);
    expect(sharedHomeSummaryResponse.safeParse({ ...summary, topCategories: [{}] }).success).toBe(false);
    const top = { rank: 1, categoryId: null, categoryKey: 'food-drinks', name: 'Food & Drinks', icon: 'Utensils', color: '#EA580C', amount: 10 };
    expect(sharedHomeSummaryResponse.parse({ ...summary, topCategories: [top] }).topCategories).toEqual([top]);
  });
  it('keeps preset keys unique and falls back to the type\'s Others for a missing key', () => {
    expect(new Set(SHARED_CATEGORY_PRESETS.map(preset => preset.key)).size).toBe(SHARED_CATEGORY_PRESETS.length);
    expect(sharedCategoryOf(undefined, 'income').key).toBe('others-income');
    expect(sharedCategoryOf('salary', 'income').name).toBe('Salary');
  });
});
