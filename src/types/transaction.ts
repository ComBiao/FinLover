import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce
    .number({ error: "Amount is required" })
    .positive("Amount must be greater than 0"),
  date: z.iso.date({ error: "Enter a valid date" }),
  categoryId: z.string().nullable().optional(),
  note: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
