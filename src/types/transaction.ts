import { z } from "zod";

import type { TransactionType } from "@/types/category";
import type { DateRange } from "@/types/dateRange";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce
    .number({ error: "Amount is required" })
    .positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1).nullable().optional(),
  note: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

/** A single transaction record, as displayed/filtered in the Transactions list. */
export type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  /** Absent/undefined means the transaction is uncategorized. */
  categoryId?: string;
  walletId: string;
  date: Date;
  note?: string;
};

/** Filter criteria for the Transactions list — `undefined`/empty means "no filter". */
export type TransactionFilters = {
  search: string;
  type?: TransactionType;
  walletId?: string;
  categoryId?: string;
  dateRange?: DateRange;
};

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  search: "",
  type: undefined,
  walletId: undefined,
  categoryId: undefined,
  dateRange: undefined,
};
