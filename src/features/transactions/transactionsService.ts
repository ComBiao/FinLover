import type { MonthKey } from "@/features/homepage/month";
import { deleteApi, getApi, postApi, putApi } from "@/lib/api/client";
import { toLocalISODate } from "@/lib/utils";
import type { TransactionType } from "@/types/category";
import type { Transaction } from "@/types/transaction";

/** One row of `GET/POST /api/v1/transactions` (see `transactionResponse` in `@/shared/contracts`). */
type TransactionDto = {
  id: string;
  walletId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  title: string;
  note?: string;
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
    type: dto.type,
    amount: dto.amount,
    date: parseLocalISODate(dto.date),
    title: dto.title,
    note: dto.note,
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

export async function createTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  const created = await postApi<TransactionDto>("/api/v1/transactions", {
    walletId: input.walletId,
    categoryId: input.categoryId ?? null,
    type: input.type,
    amount: input.amount,
    date: toLocalISODate(input.date),
    title: input.title,
    note: input.note,
  });
  return toTransaction(created);
}

/** `PUT` replaces the editable fields; the wallet can't be changed, so it isn't sent. */
export async function updateTransaction(
  id: string,
  input: Omit<Transaction, "id">
): Promise<Transaction> {
  const updated = await putApi<TransactionDto>(`/api/v1/transactions/${id}`, {
    categoryId: input.categoryId ?? null,
    type: input.type,
    amount: input.amount,
    date: toLocalISODate(input.date),
    title: input.title,
    note: input.note,
  });
  return toTransaction(updated);
}

export function deleteTransaction(id: string): Promise<void> {
  return deleteApi(`/api/v1/transactions/${id}`);
}
