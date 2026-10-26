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

/**
 * The fixed category list shared wallets use. Real Category documents belong to one
 * user, so a shared transaction stores one of these keys instead: every member sees
 * the same list and it cannot be added to or edited. Order matches the defaults seeded
 * for each user at registration, and each key is unique across income and expense.
 */
export const SHARED_CATEGORY_PRESETS = [
  { key: 'food-drinks', name: 'Food & Drinks', type: 'expense', color: '#EA580C', icon: 'Utensils' },
  { key: 'transportation', name: 'Transportation', type: 'expense', color: '#2563EB', icon: 'Car' },
  { key: 'essentials', name: 'Essentials', type: 'expense', color: '#16A34A', icon: 'Home' },
  { key: 'shopping', name: 'Shopping', type: 'expense', color: '#DB2777', icon: 'ShoppingCart' },
  { key: 'utilities', name: 'Utilities', type: 'expense', color: '#CA8A04', icon: 'Zap' },
  { key: 'health', name: 'Health', type: 'expense', color: '#DC2626', icon: 'HeartPulse' },
  { key: 'entertainment', name: 'Entertainment', type: 'expense', color: '#9333EA', icon: 'Film' },
  { key: 'others-expense', name: 'Others', type: 'expense', color: '#4B5563', icon: 'MoreHorizontal' },
  { key: 'salary', name: 'Salary', type: 'income', color: '#16A34A', icon: 'Wallet' },
  { key: 'wages', name: 'Wages', type: 'income', color: '#059669', icon: 'Banknote' },
  { key: 'allowance-gift', name: 'Allowance/Gift', type: 'income', color: '#DB2777', icon: 'Gift' },
  { key: 'bonus', name: 'Bonus', type: 'income', color: '#CA8A04', icon: 'Award' },
  { key: 'investment', name: 'Investment', type: 'income', color: '#2563EB', icon: 'PieChart' },
  { key: 'others-income', name: 'Others', type: 'income', color: '#4B5563', icon: 'MoreHorizontal' },
] as const satisfies readonly { key: string; name: string; type: 'income' | 'expense'; color: string; icon: CategoryIcon }[];
export type SharedCategoryPreset = (typeof SHARED_CATEGORY_PRESETS)[number];
export type SharedCategoryKey = SharedCategoryPreset['key'];
export const sharedCategoryKey = z.enum(SHARED_CATEGORY_PRESETS.map(preset => preset.key) as [SharedCategoryKey, ...SharedCategoryKey[]]);
/** The per-type catch-all; a shared transaction without a stored key counts as this. */
export const defaultSharedCategoryKey = (type: 'income' | 'expense'): SharedCategoryKey => type === 'income' ? 'others-income' : 'others-expense';
/** The preset a stored key points to; a missing or unknown key falls back to the type's "Others". */
export function sharedCategoryOf(key: string | null | undefined, type: 'income' | 'expense'): SharedCategoryPreset {
  return SHARED_CATEGORY_PRESETS.find(preset => preset.key === key) ?? SHARED_CATEGORY_PRESETS.find(preset => preset.key === defaultSharedCategoryKey(type))!;
}
export const sharedCategoryResponse = z.object({ key: sharedCategoryKey, name: z.string(), icon: categoryIcon, color: z.string() });
export const categoryInput = z.object({
  name: z.string().trim().min(1).max(50),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: categoryIcon.optional(),
});
export const categoryUpdate = categoryInput.partial();
export const categoryListQuery = z.object({ type: z.enum(['income', 'expense']).optional() });
// `categoryKey` is for shared wallets only (see SHARED_CATEGORY_PRESETS); personal wallets use `categoryId`.
export const transactionInput = z.object({ walletId: objectId, categoryId: objectId.nullable().optional(), categoryKey: sharedCategoryKey.nullable().optional(), type: z.enum(['income', 'expense']), amount: z.number().min(0.01), date: z.iso.date(), title: z.string().trim().min(1).max(100), note: z.string().max(255).optional() });
export const transactionUpdate = transactionInput.extend({ walletId: objectId.optional() });
export const transactionAttribution = z.object({ id: objectId, name: z.string().min(1) });
// Optional during the E7 contract-first rollout; personal responses omit attribution.
export const transactionResponse = transactionInput.omit({ categoryKey: true }).extend({ id: objectId, categoryId: objectId.nullable(), createdBy: transactionAttribution.optional(), editedBy: transactionAttribution.optional() });
export const transactionMonthQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must use YYYY-MM format').optional(),
  // Case-insensitive substring match on title or note; blank means no search.
  search: z.string().trim().max(100).optional().transform(value => value || undefined),
});
export const transactionSummaryQuery = z.object({
  // Inclusive calendar-date range, matching the Transactions page period (a month, a year or picked days).
  from: z.iso.date(),
  to: z.iso.date(),
  walletId: objectId.optional(),
  categoryId: objectId.optional(),
  type: z.enum(['income', 'expense']).optional(),
  search: transactionMonthQuery.shape.search,
}).refine(value => value.from <= value.to, { message: 'from must not be after to', path: ['to'] });
export const transactionSummaryResponse = z.object({ totalIncome: z.number(), totalExpense: z.number(), netBalance: z.number() });
export const homeSummaryQuery = z.object({
  month: transactionMonthQuery.shape.month,
  // "all" (the default) totals every owned wallet; an id scopes the summary to that wallet.
  walletId: z.union([z.literal('all'), objectId]).optional().transform(value => value ?? 'all'),
});
const homeTopCategory = z.object({
  rank: z.number().int().min(1), categoryId: objectId.nullable(), name: z.string(),
  icon: z.string().nullable(), color: z.string().nullable(), amount: z.number(),
});
export const homeSummaryResponse = z.object({
  month: z.string(),
  walletId: z.string(),
  balance: z.object({
    hasWallets: z.boolean(),
    totalBalance: z.number(),
    savingGoal: z.object({
      walletId: objectId, walletName: z.string(), goal: z.number(), current: z.number(),
      percent: z.number().int().min(0).max(100), remaining: z.number(), reached: z.boolean(),
    }).nullable(),
  }),
  income: z.number(),
  expense: z.number(),
  net: z.object({ net: z.number(), status: z.enum(['surplus', 'overspending', 'even']) }),
  topCategories: z.array(homeTopCategory),
});

// Reports (Epic 8, contract v1.1). Dates are inclusive YYYY-MM-DD calendar days; money is rounded to 2 places by the server.
export const reportInterval = z.enum(['daily', 'weekly', 'monthly']);
export const runningBalanceInterval = reportInterval.exclude(['monthly']);
// Comma-separated wallet ids; omitted means every personal wallet, while an empty list is rejected.
const reportWalletIds = z.string().transform((value, ctx) => {
  const ids = [...new Set(value.split(',').map(id => id.trim()).filter(Boolean))];
  if (!ids.length) ctx.addIssue({ code: 'custom', message: 'Select at least one wallet' });
  else if (!ids.every(id => objectId.safeParse(id).success)) ctx.addIssue({ code: 'custom', message: 'walletIds must be comma-separated wallet IDs' });
  return ids;
}).optional();
const reportRange = { walletIds: reportWalletIds, startDate: z.iso.date(), endDate: z.iso.date() };
const validRange = (value: { startDate: string; endDate: string }) => value.startDate <= value.endDate;
const rangeError = { message: 'endDate must not be before startDate', path: ['endDate'] };
export const reportQuery = z.object(reportRange).refine(validRange, rangeError);
export const cashFlowQuery = z.object({ ...reportRange, interval: reportInterval.optional() }).refine(validRange, rangeError);
export const runningBalanceQuery = z.object({ ...reportRange, interval: runningBalanceInterval.default('daily') }).refine(validRange, rangeError);
export const reportSummaryResponse = z.object({ totalIncome: z.number(), totalExpense: z.number(), netCashFlow: z.number(), transactionCount: z.number().int().nonnegative() });
export const cashFlowBucket = z.object({ label: z.string(), start: z.iso.date(), end: z.iso.date(), income: z.number(), expense: z.number() });
export const cashFlowResponse = z.object({ interval: reportInterval, suggestedInterval: reportInterval, buckets: z.array(cashFlowBucket) });
export const categoryDistributionItem = z.object({
  // null only when the user has no seeded Others of that type to collect category-less transactions.
  categoryId: objectId.nullable(), name: z.string(), icon: z.string().nullable(), color: z.string().nullable(),
  amount: z.number(), percentage: z.number(),
});
export const categoryDistributionGroup = z.object({ total: z.number(), items: z.array(categoryDistributionItem) });
export const categoryDistributionResponse = z.object({ income: categoryDistributionGroup, expense: categoryDistributionGroup });
export const runningBalancePoint = z.object({ date: z.iso.date(), balance: z.number() });
export const runningBalanceResponse = z.object({ interval: runningBalanceInterval, openingBalance: z.number(), closingBalance: z.number(), points: z.array(runningBalancePoint) });
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
export const walletRole = z.enum(['owner', 'contributor']);
export const walletMemberStatus = z.enum(['pending', 'accepted']);
export const walletSharingFields = {
  isShared: z.boolean(),
  role: walletRole,
  memberCount: z.number().int().min(1),
  membersPreview: z.array(transactionAttribution).max(3),
  ownerName: z.string().min(1),
};
// Existing endpoints do not emit these fields until E7-01b/02. No defaults that
// would make a missing implementation appear to return authoritative metadata.
export const walletResponse = walletInput.extend({ id: objectId, balance: z.number(), isDefault: z.boolean(), isSaving: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), ...z.object(walletSharingFields).partial().shape });
export const walletSavingUpdate = z.object({ isSaving: z.boolean(), goalAmount: z.number().optional() }).superRefine((value, ctx) => {
  if (value.isSaving && !(value.goalAmount !== undefined && value.goalAmount > 0)) ctx.addIssue({ code: 'custom', path: ['goalAmount'], message: 'Goal amount must be greater than 0 when saving is on' });
});
export const apiError = z.object({ code: z.string(), message: z.string(), fields: z.record(z.string(), z.string()).optional() });
export type ApiResult<T> = { status: true; data: T } | { status: false; error: z.infer<typeof apiError>; timestamp: string; path: string };

export const legacyTransactionInput = z.object({
  wallet_id: z.string().min(1, 'wallet_id is required'),
  category_id: z.string().min(1).optional().nullable(),
  category_key: sharedCategoryKey.optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
  error: 'type is required and must be "Income" or "Expense"',}),
  amount: z.number({ error: 'amount is required and must be a number' }).positive('amount must be greater than 0'),
  date: z.string().min(1, 'date is required'),
  title: z.string({ error: 'title is required' }).trim().min(1, 'title is required').max(100),
  note: z.string().max(255).optional(),
});

export const legacyTransactionUpdate = z.object({
  wallet_id: z.string().min(1).optional(),
  category_id: z.string().min(1).optional().nullable(),
  category_key: sharedCategoryKey.optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
    error: 'type is required and must be "Income" or "Expense"',
  }),
  amount: z.number({ error: 'amount is required and must be a number' }).positive('amount must be greater than 0'),
  date: z.string().min(1, 'date is required'),
  title: z.string({ error: 'title is required' }).trim().min(1, 'title is required').max(100),
  note: z.string().max(255).optional(),
});


// E7-01a target contracts. These do not enable shared behavior in live handlers.
export const sharedWalletInput = walletInput.extend({ isShared: z.literal(true) });
export const walletCreateInput = walletInput.extend({ isShared: z.boolean().optional() });
export const sharedWalletResponse = walletResponse.extend({ ...walletSharingFields, isShared: z.literal(true) });
export const walletMemberResponse = z.discriminatedUnion('role', [
  z.object({ userId: objectId, name: z.string().min(1), email: z.email(), role: z.literal('owner'), status: z.literal('accepted') }),
  z.object({ userId: objectId, name: z.string().min(1), email: z.email(), role: z.literal('contributor'), status: walletMemberStatus }),
]);
export const walletMembersResponse = z.object({ members: z.array(walletMemberResponse) });
export const walletInvitationInput = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) });
export const walletInvitationResponse = z.object({
  id: objectId, walletId: objectId, walletName: z.string().min(1),
  invitedByName: z.string().min(1), createdAt: z.iso.datetime(),
});
export const myInvitationsResponse = z.object({ items: z.array(walletInvitationResponse), total: z.number().int().nonnegative() });
export const transferOwnershipInput = z.object({ userId: objectId });
// Strict target schemas reject categoryId, including null, and wallet moves; a shared
// transaction picks from the fixed presets with `categoryKey` instead.
// Services must select these using the persisted wallet, never a client flag.
export const sharedTransactionInput = transactionInput.omit({ categoryId: true }).strict();
export const sharedTransactionUpdate = sharedTransactionInput.omit({ walletId: true }).strict();
export const sharedTransactionResponse = transactionResponse.omit({ categoryId: true }).extend({
  createdBy: transactionAttribution,
  category: sharedCategoryResponse,
}).strict();
export const sharedHomeSummaryResponse = homeSummaryResponse.extend({
  walletId: objectId,
  topCategories: z.array(homeTopCategory.extend({ categoryId: z.null(), categoryKey: sharedCategoryKey })).max(3),
});
export const invitationEmailError = apiError.extend({
  code: z.literal('VALIDATION_ERROR'),
  fields: z.object({ email: z.enum(['User not found', 'Cannot invite yourself']) }),
});
export type WalletRole = z.infer<typeof walletRole>;
export type WalletMemberStatus = z.infer<typeof walletMemberStatus>;
export type WalletCreateInput = z.infer<typeof walletCreateInput>;
export type SharedWalletResponse = z.infer<typeof sharedWalletResponse>;
export type WalletMemberResponse = z.infer<typeof walletMemberResponse>;
export type WalletMembersResponse = z.infer<typeof walletMembersResponse>;
export type WalletInvitationInput = z.infer<typeof walletInvitationInput>;
export type WalletInvitationResponse = z.infer<typeof walletInvitationResponse>;
export type MyInvitationsResponse = z.infer<typeof myInvitationsResponse>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipInput>;
export type SharedTransactionInput = z.infer<typeof sharedTransactionInput>;
export type SharedTransactionUpdate = z.infer<typeof sharedTransactionUpdate>;
export type SharedTransactionResponse = z.infer<typeof sharedTransactionResponse>;
export type SharedHomeSummaryResponse = z.infer<typeof sharedHomeSummaryResponse>;
export type ReportInterval = z.infer<typeof reportInterval>;
export type RunningBalanceInterval = z.infer<typeof runningBalanceInterval>;
export type ReportQuery = z.infer<typeof reportQuery>;
export type CashFlowQuery = z.infer<typeof cashFlowQuery>;
export type RunningBalanceQuery = z.infer<typeof runningBalanceQuery>;
export type ReportSummaryResponse = z.infer<typeof reportSummaryResponse>;
export type CashFlowBucket = z.infer<typeof cashFlowBucket>;
export type CashFlowResponse = z.infer<typeof cashFlowResponse>;
export type CategoryDistributionItem = z.infer<typeof categoryDistributionItem>;
export type CategoryDistributionResponse = z.infer<typeof categoryDistributionResponse>;
export type RunningBalancePoint = z.infer<typeof runningBalancePoint>;
export type RunningBalanceResponse = z.infer<typeof runningBalanceResponse>;
