import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

function formatCurrency(amount: number) {
  return `฿${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

type SummaryCardsProps = {
  transactions: Transaction[];
};

/** Total Income / Total Expense / Net Balance, computed from the currently filtered transactions. */
export function SummaryCards({ transactions }: SummaryCardsProps) {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const cards = [
    { label: "Total Income", value: totalIncome, valueClassName: "text-success" },
    { label: "Total Expense", value: totalExpense, valueClassName: "text-destructive" },
    {
      label: "Net Balance",
      value: netBalance,
      valueClassName: netBalance >= 0 ? "text-success" : "text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="rounded-2xl shadow-sm">
          <CardContent className="py-1">
            <div className="text-sm font-medium text-muted-foreground">{card.label}</div>
            <div className={cn("mt-1.5 text-2xl font-bold", card.valueClassName)}>
              {formatCurrency(card.value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
