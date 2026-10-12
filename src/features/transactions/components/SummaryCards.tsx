import { IncomeCard, NetCard, SpentCard } from "@/features/homepage/components/HomeCards";
import { periodLabel, type TransactionPeriod } from "@/features/transactions/period";
import { summarizeTransactions } from "@/features/transactions/transactions";
import type { Transaction } from "@/types/transaction";

type SummaryCardsProps = {
  transactions: Transaction[];
  period: TransactionPeriod;
  isLoading?: boolean;
};

/**
 * Spent / Income / Net for the selected period, computed from the currently
 * filtered transactions. Reuses Home's cards — same wording, order and look —
 * with the period ("October 2026", "2026", a day range) in place of Home's month.
 */
export function SummaryCards({ transactions, period, isLoading = false }: SummaryCardsProps) {
  const { totalIncome, totalExpense, netBalance } = summarizeTransactions(transactions);
  const label = periodLabel(period);
  const status = netBalance > 0 ? "surplus" : netBalance < 0 ? "overspending" : "even";

  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
      <SpentCard
        monthLabel={label}
        amount={totalExpense}
        emptyLabel="No spending recorded in this period"
        isLoading={isLoading}
      />
      <IncomeCard
        monthLabel={label}
        amount={totalIncome}
        emptyLabel="No income recorded in this period"
        isLoading={isLoading}
      />
      <NetCard
        monthLabel={label}
        net={netBalance}
        status={status}
        income={totalIncome}
        expense={totalExpense}
        isLoading={isLoading}
      />
    </div>
  );
}
