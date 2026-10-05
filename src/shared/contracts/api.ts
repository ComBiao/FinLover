import { z } from 'zod';
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
export const categoryInput = z.object({ name: z.string().trim().min(1).max(50), type: z.enum(['income', 'expense']), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional() });
export const categoryUpdate = categoryInput.partial();
export const transactionInput = z.object({ walletId: objectId, categoryId: objectId.nullable().optional(), type: z.enum(['income', 'expense']), amount: z.number().min(0.01), date: z.iso.date(), note: z.string().max(255).optional() });
export const transactionUpdate = transactionInput.omit({ walletId: true });
export const transactionResponse = transactionInput.extend({ id: objectId, categoryId: objectId.nullable() });
export const categoryResponse = categoryInput.extend({ id: objectId, isSystem: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export const walletInput = z.object({ name: z.string().trim().min(1).max(50), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), isSaving: z.boolean().optional(), goalAmount: z.number().min(0).optional()});
export const walletUpdate = walletInput.partial();
export const walletResponse = walletInput.extend({ id: objectId, balance: z.number(), isDefault: z.boolean(), isSaving: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export const apiError = z.object({ code: z.string(), message: z.string(), fields: z.record(z.string(), z.string()).optional() });
export type ApiResult<T> = { status: true; data: T } | { status: false; error: z.infer<typeof apiError>; timestamp: string; path: string };

export const legacyTransactionInput = z.object({
  wallet_id: z.string().min(1, 'wallet_id is required'),
  category_id: z.string().min(1).optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
  error: 'type is required and must be "Income" or "Expense"',}),
  amount: z.number({ error: 'amount is required and must be a number' }).positive('amount must be greater than 0'),
  date: z.string().min(1, 'date is required'),
  note: z.string().max(255).optional(),
});

export const legacyTransactionUpdate = z.object({
  category_id: z.string().min(1).optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
    error: 'type is required and must be "Income" or "Expense"',
  }),
  amount: z.number({ error: 'amount is required and must be a number' }).positive('amount must be greater than 0'),
  date: z.string().min(1, 'date is required'),
  note: z.string().max(255).optional(),
});
