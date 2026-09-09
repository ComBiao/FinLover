import { QuickAddBar } from "@/components/QuickAddBar";

import { AddTransactionModal } from "./_components/AddTransactionModal";
import { CategoryBreakdown } from "./_components/CategoryBreakdown";
import { RecentTransactions } from "./_components/RecentTransactions";
import { SavingsGoal } from "./_components/SavingsGoal";
import { SpendingTrendChart } from "./_components/SpendingTrendChart";
import { SummaryCards } from "./_components/SummaryCards";
import { userName } from "./_components/mock-data";

/**
 * Main dashboard page displaying financial overview, spending trends, and recent transactions.
 */
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-[22px] pb-28">
        <div>
          <div className="text-2xl font-extrabold text-foreground sm:text-3xl">
            Good afternoon, {userName}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your money at a glance.
          </div>
        </div>

        <SummaryCards />

        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3">
          <SpendingTrendChart />
          <CategoryBreakdown />
          <SavingsGoal />
        </div>

        <RecentTransactions />
      </div>

      <AddTransactionModal />
      <QuickAddBar />
    </main>
  );
}
