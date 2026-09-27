import { AddTransactionModal } from "@/features/transactions/components/AddTransactionModal";
import { CategoryBreakdown } from "@/features/dashboard/components/CategoryBreakdown";
import { QuickAddBar } from "@/features/transactions/components/QuickAddBar";
import { RecentTransactions } from "@/features/dashboard/components/RecentTransactions";
import { SavingsGoal } from "@/features/dashboard/components/SavingsGoal";
import { SpendingTrendChart } from "@/features/dashboard/components/SpendingTrendChart";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { userName } from "@/mocks/mock-data";

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
