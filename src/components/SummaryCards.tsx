import { Card, CardContent } from "@/components/ui/card";

import { balance, income, spending } from "@/lib/mock-data";

/**
 * Displays three summary cards showing total balance, income, and spending this month.
 * TODO: replace hardcoded balance/income/spend figures with a
 * `useDashboardData` react-query hook once GET /api/transactions exists.
 */
export function SummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
      <Card className="rounded-2xl bg-gradient-pastel-a shadow-sm">
        <CardContent className="flex h-full flex-col justify-between gap-3 py-1">
          <div className="text-[11.5px] font-bold tracking-wide text-foreground/70 uppercase">
            Total balance
          </div>
          <div className="text-3xl font-extrabold text-foreground">
            ฿{balance.amount}
          </div>
          <span className="w-fit rounded-full bg-card px-2.5 py-1 text-xs font-bold text-success">
            {balance.changeLabel}
          </span>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="py-1">
          <div className="text-[11.5px] font-bold tracking-wide text-muted-foreground uppercase">
            Income this month
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground">
            ฿{income.amount}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {income.sourceLabel} · {income.dateLabel}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="py-1">
          <div className="text-[11.5px] font-bold tracking-wide text-muted-foreground uppercase">
            Spent this month
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground">
            ฿{spending.amount}
          </div>
          <div className="mt-2 text-xs font-semibold text-destructive">
            {spending.changeLabel}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
