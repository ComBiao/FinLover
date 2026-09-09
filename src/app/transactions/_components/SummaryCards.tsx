import { ArrowDownRight, ArrowUpRight, Wallet, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

function formatCurrency(amount: number) {
  return `฿${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

type SummaryCardsProps = {
  transactions: Transaction[];
};

type SummaryCard = {
  label: string;
  value: number;
  valueClassName: string;
  cardClassName: string;
  icon: LucideIcon;
  iconClassName: string;
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

  const cards: SummaryCard[] = [
    {
      label: "Total Income",
      value: totalIncome,
      valueClassName: "text-success",
      cardClassName: "border-l-4 border-l-success bg-gradient-to-br from-success-bg to-card",
      icon: ArrowUpRight,
      iconClassName: "bg-success-bg text-success",
    },
    {
      label: "Total Expense",
      value: totalExpense,
      valueClassName: "text-destructive",
      cardClassName: "border-l-4 border-l-destructive bg-gradient-to-br from-danger-bg to-card",
      icon: ArrowDownRight,
      iconClassName: "bg-danger-bg text-destructive",
    },
    {
      label: "Net Balance",
      value: netBalance,
      valueClassName: netBalance >= 0 ? "text-success" : "text-destructive",
      cardClassName: "bg-gradient-pastel-a",
      icon: Wallet,
      iconClassName: "bg-card/60 text-foreground",
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 sm:flex-row">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={cn(
            "flex-1 rounded-2xl shadow-sm transition-shadow hover:shadow-md",
            card.cardClassName
          )}
        >
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="min-w-0">
              <div className="text-sm font-medium text-muted-foreground">{card.label}</div>
              <div
                className={cn(
                  "mt-1.5 truncate text-xl font-bold sm:text-2xl",
                  card.valueClassName
                )}
              >
                {formatCurrency(card.value)}
              </div>
            </div>
            <div
              className={cn(
                "hidden size-9 shrink-0 items-center justify-center rounded-full sm:flex",
                card.iconClassName
              )}
            >
              <card.icon className="size-4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
