import { Card, CardContent } from "@/components/ui/card";

import { transactions } from "./mock-data";

/**
 * Displays a list of recent transactions with icons, categories, dates, and amounts.
 */
export function RecentTransactions() {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="py-1">
        <div className="mb-3.5 text-sm font-bold text-foreground">
          Recent transactions
        </div>
        <ul>
          {transactions.map((tx, index) => (
            <li
              key={`${tx.name}-${tx.date}`}
              className={`flex items-center gap-3.5 py-2.5 ${
                index < transactions.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tx.iconClassName}`}
              >
                <tx.icon className="size-4" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {tx.name}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {tx.category} · {tx.date}
                </div>
              </div>
              <div className={`text-sm font-bold ${tx.amountClassName}`}>
                {tx.amount}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
