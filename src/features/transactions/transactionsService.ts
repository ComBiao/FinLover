import type { MonthKey } from "@/features/homepage/month";
import { deleteApi, getApi, postApi, putApi } from "@/lib/api/client";
import { toLocalISODate } from "@/lib/utils";
import type { TransactionType } from "@/types/category";
import type { Transaction } from "@/types/transaction";
import type { TransactionSummary } from "@/features/transactions/transactions";
import { isMockTarget } from "@/features/wallets/shared/mockFlag";
import {
  mockCreateTransaction,
  mockDeleteTransaction,
  mockListTransactions,
  mockUpdateTransaction,
} from "@/features/wallets/shared/mock/sharedWalletMockStore";
import type { TransactionAuthor } from "@/features/wallets/shared/types";

/** One row of `GET/POST /api/v1/transactions` (see `transactionResponse` in `@/shared/contracts`). */
type TransactionDto = {
  id: string;
  walletId: string;
  /** Absent on shared-wallet rows, which use `category` instead. */
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  title: string;
  note?: string;
  /** Shared wallets only: the fixed preset this row belongs to (shared rows have no `categoryId`). */
  category?: { key: string };
  /** Shared wallets only (TODO(backend E7-06): added to the transaction response). */
  createdBy?: TransactionAuthor;
  editedBy?: TransactionAuthor | null;
};

/** Parses `YYYY-MM-DD` as a local date — `new Date(value)` would be UTC midnight and can show the previous day. */
function parseLocalISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toTransaction(dto: TransactionDto): Transaction {
  return {
    id: dto.id,
    walletId: dto.walletId,
    categoryId: dto.categoryId ?? undefined,
    ...(dto.category ? { categoryKey: dto.category.key } : {}),
    type: dto.type,
    amount: dto.amount,
    date: parseLocalISODate(dto.date),
    title: dto.title,
    note: dto.note,
    ...(dto.createdBy ? { createdBy: dto.createdBy } : {}),
    ...(dto.editedBy ? { editedBy: dto.editedBy } : {}),
  };
}

/** Transactions for every given month, newest first. The API serves one `YYYY-MM` per request. */
export async function getTransactions(months: MonthKey[]): Promise<Transaction[]> {
  const pages = await Promise.all(
    months.map((month) => getApi<TransactionDto[]>(`/api/v1/transactions?month=${month}`))
  );
  return pages
    .flat()
    .map(toTransaction)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Shared wallets send a preset `categoryKey` (and must not send `categoryId`); personal wallets send `categoryId`. */
function categoryFields(input: Pick<Transaction, "categoryId" | "categoryKey">) {
  return input.categoryKey ? { categoryKey: input.categoryKey } : { categoryId: input.categoryId ?? null };
}

export async function createTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  // TODO(backend E7-11): remove; POST /api/v1/transactions will accept a shared wallet (members only, 403 otherwise, no categoryId).
  if (isMockTarget(input.walletId)) {
    return toTransaction(
      await mockCreateTransaction({
        walletId: input.walletId,
        type: input.type,
        amount: input.amount,
        date: toLocalISODate(input.date),
        title: input.title,
        note: input.note,
        categoryId: input.categoryId ?? null,
      })
    );
  }

  const created = await postApi<TransactionDto>("/api/v1/transactions", {
    walletId: input.walletId,
    ...categoryFields(input),
    type: input.type,
    amount: input.amount,
    date: toLocalISODate(input.date),
    title: input.title,
    note: input.note,
  });
  return toTransaction(created);
}

/** `PUT` replaces the editable fields (including moving the transaction to a different wallet). */
export async function updateTransaction(
  id: string,
  input: Omit<Transaction, "id">
): Promise<Transaction> {
  // TODO(backend E7-13): remove; PUT /api/v1/transactions/{id} will let any member of a shared wallet edit any row.
  if (isMockTarget(id)) {
    return toTransaction(
      await mockUpdateTransaction(id, {
        type: input.type,
        amount: input.amount,
        date: toLocalISODate(input.date),
        title: input.title,
        note: input.note,
        categoryId: input.categoryId ?? null,
      })
    );
  }

  const updated = await putApi<TransactionDto>(`/api/v1/transactions/${id}`, {
    walletId: input.walletId,
    ...categoryFields(input),
    type: input.type,
    amount: input.amount,
    date: toLocalISODate(input.date),
    title: input.title,
    note: input.note,
  });
  return toTransaction(updated);
}

export function deleteTransaction(id: string): Promise<void> {
  // TODO(backend E7-13): remove; DELETE /api/v1/transactions/{id} will let any member of a shared wallet delete any row.
  if (isMockTarget(id)) return mockDeleteTransaction(id);

  return deleteApi(`/api/v1/transactions/${id}`);
}

/**
 * One shared wallet's transactions for a month, newest first, from every member
 * (`createdBy` / `editedBy` set on each row). Members only.
 *
 * TODO(backend E7-11): `GET /api/v1/wallets/{id}/transactions?month=YYYY-MM`.
 */
export async function getSharedWalletTransactions(walletId: string, month: MonthKey): Promise<Transaction[]> {
  const rows = isMockTarget(walletId)
    ? await mockListTransactions(walletId, month)
    : await getApi<TransactionDto[]>(`/api/v1/wallets/${walletId}/transactions?month=${month}`);
  return rows.map(toTransaction).sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Query for `GET /api/v1/transactions/summary`: an inclusive `YYYY-MM-DD` range plus the list's optional filters. */
export type TransactionSummaryQuery = {
  from: string;
  to: string;
  walletId?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
};

export function getTransactionSummary(query: TransactionSummaryQuery): Promise<TransactionSummary> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  return getApi<TransactionSummary>(`/api/v1/transactions/summary?${params}`);
}
