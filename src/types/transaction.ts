import { z } from "zod";

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
