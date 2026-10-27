import { IncomeCard, NetCard, SpentCard } from "@/features/homepage/components/HomeCards";
import { periodLabel, type TransactionPeriod } from "@/features/transactions/period";
import type { TransactionSummary } from "@/features/transactions/transactions";

type SummaryCardsProps = {
  summary: TransactionSummary | undefined;
  period: TransactionPeriod;
  isLoading?: boolean;
};

const EMPTY_SUMMARY: TransactionSummary = { totalIncome: 0, totalExpense: 0, netBalance: 0 };

/**
 * Spent / Income / Net for the selected period and filters, as totalled by
 * the server. Reuses Home's cards — same wording, order and look — with the
 * period ("October 2026", "2026", a day range) in place of Home's month.
 */
export function SummaryCards({ summary = EMPTY_SUMMARY, period, isLoading = false }: SummaryCardsProps) {
  const { totalIncome, totalExpense, netBalance } = summary;
  const label = periodLabel(period);
  const status = netBalance > 0 ? "surplus" : netBalance < 0 ? "overspending" : "even";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-[18px]">
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
        className="col-span-2 md:col-span-1"
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
