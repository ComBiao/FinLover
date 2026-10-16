import { z } from 'zod';
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
export const CATEGORY_ICON_NAMES = [
  'Utensils',
  'Car',
  'Home',
  'ShoppingCart',
  'Zap',
  'HeartPulse',
  'Film',
  'Wallet',
  'Banknote',
  'Gift',
  'Award',
  'PieChart',
  'MoreHorizontal',
  'Star',
  'Smile',
  'GraduationCap',
  'Briefcase',
  'CreditCard',
] as const;
export const categoryIcon = z.enum(CATEGORY_ICON_NAMES);
export type CategoryIcon = z.infer<typeof categoryIcon>;
export const categoryInput = z.object({
  name: z.string().trim().min(1).max(50),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: categoryIcon.optional(),
});
export const categoryUpdate = categoryInput.partial();
export const categoryListQuery = z.object({ type: z.enum(['income', 'expense']).optional() });
export const transactionInput = z.object({ walletId: objectId, categoryId: objectId.nullable().optional(), type: z.enum(['income', 'expense']), amount: z.number().min(0.01), date: z.iso.date(), title: z.string().trim().min(1).max(100), note: z.string().max(255).optional() });
export const transactionUpdate = transactionInput.omit({ walletId: true });
export const transactionResponse = transactionInput.extend({ id: objectId, categoryId: objectId.nullable() });
export const transactionMonthQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must use YYYY-MM format').optional(),
  // Case-insensitive substring match on title or note; blank means no search.
  search: z.string().trim().max(100).optional().transform(value => value || undefined),
});
export const homeSummaryQuery = z.object({
  month: transactionMonthQuery.shape.month,
  // "all" (the default) totals every owned wallet; an id scopes the summary to that wallet.
  walletId: z.union([z.literal('all'), objectId]).optional().transform(value => value ?? 'all'),
});
export const homeSummaryResponse = z.object({
  month: z.string(),
  walletId: z.string(),
  balance: z.object({ hasWallets: z.boolean(), totalBalance: z.number() }),
  income: z.number(),
  expense: z.number(),
  net: z.object({ net: z.number(), status: z.enum(['surplus', 'overspending', 'even']) }),
});
export const categoryResponse = categoryInput.extend({ id: objectId, isSystem: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export const WALLET_ICON_NAMES = [
  'Wallet',
  'Banknote',
  'CreditCard',
  'Landmark',
  'Coins',
  'PiggyBank',
  'CircleDollarSign',
  'Gem',
  'Briefcase',
  'ShoppingBag',
  'Plane',
  'ShieldCheck',
  'Receipt',
] as const;
export const walletIcon = z.enum(WALLET_ICON_NAMES);
export type WalletIconName = z.infer<typeof walletIcon>;
export const walletInput = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().trim().min(1).max(50).optional(),
  isSaving: z.boolean().optional(),
  goalAmount: z.number().min(0).optional(),
});
export const walletUpdate = walletInput.pick({ name: true, color: true, icon: true }).partial();
export const walletResponse = walletInput.extend({ id: objectId, balance: z.number(), isDefault: z.boolean(), isSaving: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export const walletSavingUpdate = z.object({ isSaving: z.boolean(), goalAmount: z.number().optional() }).superRefine((value, ctx) => {
  if (value.isSaving && !(value.goalAmount !== undefined && value.goalAmount > 0)) ctx.addIssue({ code: 'custom', path: ['goalAmount'], message: 'Goal amount must be greater than 0 when saving is on' });
});
export const apiError = z.object({ code: z.string(), message: z.string(), fields: z.record(z.string(), z.string()).optional() });
export type ApiResult<T> = { status: true; data: T } | { status: false; error: z.infer<typeof apiError>; timestamp: string; path: string };

export const legacyTransactionInput = z.object({
  wallet_id: z.string().min(1, 'wallet_id is required'),
  category_id: z.string().min(1).optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
  error: 'type is required and must be "Income" or "Expense"',}),
  amount: z.number({ error: 'amount is required and must be a number' }).positive('amount must be greater than 0'),
  date: z.string().min(1, 'date is required'),
  title: z.string({ error: 'title is required' }).trim().min(1, 'title is required').max(100),
  note: z.string().max(255).optional(),
});

export const legacyTransactionUpdate = z.object({
  category_id: z.string().min(1).optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
    error: 'type is required and must be "Income" or "Expense"',
  }),
  amount: z.number({ error: 'amount is required and must be a number' }).positive('amount must be greater than 0'),
  date: z.string().min(1, 'date is required'),
  title: z.string({ error: 'title is required' }).trim().min(1, 'title is required').max(100),
  note: z.string().max(255).optional(),
});
