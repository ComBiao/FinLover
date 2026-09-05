import { Button } from "@/components/ui/button";

import { CategoryBreakdown } from "./_components/CategoryBreakdown";
import { DashboardHeader } from "./_components/DashboardHeader";
import { RecentTransactions } from "./_components/RecentTransactions";
import { SpendingTrendChart } from "./_components/SpendingTrendChart";
import { SummaryCards } from "./_components/SummaryCards";

/**
 * Main dashboard page displaying financial overview, spending trends, and recent transactions.
 */
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-card shadow-2xl">
        <DashboardHeader />

        <div className="flex flex-col gap-[22px] px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <div>
              <div className="text-xl font-extrabold text-foreground sm:text-2xl">
                Good afternoon, Alex
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                Here&apos;s your money at a glance.
              </div>
            </div>
            <div className="flex gap-2.5">
              {/* TODO: open an "add income" form/modal wired to POST /api/transactions */}
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-success-border bg-success-bg text-success hover:bg-success-bg/80"
              >
                + Income
              </Button>
              {/* TODO: open an "add expense" form/modal wired to POST /api/transactions */}
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-danger-border bg-danger-bg text-destructive hover:bg-danger-bg/80"
              >
                + Expense
              </Button>
            </div>
          </div>

          <SummaryCards />

          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.4fr_1fr]">
            <SpendingTrendChart />
            <CategoryBreakdown />
          </div>

          <RecentTransactions />
        </div>
      </div>
    </main>
  );
}
