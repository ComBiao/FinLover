"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CashFlowSection } from "@/features/reports/components/CashFlowSection";
import { ReportEmpty, ReportError, ReportSkeleton, errorMessageOf } from "@/features/reports/components/ReportStates";
import { ReportFilterBar } from "@/features/reports/components/ReportFilterBar";
import { ReportSlot } from "@/features/reports/components/ReportSlot";
import { ReportSummaryCards } from "@/features/reports/components/ReportSummaryCards";
import { useReportFilter } from "@/features/reports/hooks/useReportFilter";
import { useWallets } from "@/features/wallets/hooks/useWallets";

/**
 * Reports page (Epic 8): filter bar, summary cards, cash flow, then the
 * category distribution and running balance sections.
 *
 * The filter state lives here; once it is valid, every section receives the
 * same `{ walletIds, startDate, endDate }` and fetches for itself.
 */
export default function ReportPage() {
  const walletsQuery = useWallets();
  // Reports read personal wallets only: the API answers 404 for a shared wallet id.
  const wallets = useMemo(() => (walletsQuery.data ?? []).filter((wallet) => !wallet.isShared), [walletsQuery.data]);
  const walletOptions = useMemo(() => wallets.map(({ id, name }) => ({ id, name })), [wallets]);
  const filter = useReportFilter(wallets);
  const { applied } = filter;

  let content;
  if (walletsQuery.isPending) {
    content = (
      <Card>
        <CardContent>
          <ReportSkeleton lines={6} />
        </CardContent>
      </Card>
    );
  } else if (walletsQuery.isError) {
    content = (
      <Card>
        <CardContent>
          <ReportError message={errorMessageOf(walletsQuery.error)} onRetry={() => void walletsQuery.refetch()} />
        </CardContent>
      </Card>
    );
  } else if (wallets.length === 0) {
    content = (
      <Card>
        <CardContent className="flex flex-col items-center gap-3">
          <ReportEmpty message="Create a wallet to start seeing your reports." />
          <Button render={<Link href="/wallets" />} nativeButton={false} variant="outline" size="sm">
            Go to Wallets
          </Button>
        </CardContent>
      </Card>
    );
  } else if (applied === null) {
    content = (
      <Card>
        <CardContent>
          <ReportEmpty message="Fix the filter above to see your report." />
        </CardContent>
      </Card>
    );
  } else {
    // Ice's sections take exactly these props.
    const sectionProps = {
      walletIds: applied.walletIds,
      startDate: applied.startDate,
      endDate: applied.endDate,
    };
    void sectionProps;

    content = (
      <>
        <ReportSummaryCards filter={applied} />
        <CashFlowSection filter={applied} />
        {/* SLOT:CategoryDistribution (Ice) — replace with <CategoryDistributionSection {...sectionProps} /> */}
        <ReportSlot title="Category distribution" />
        {/* SLOT:RunningBalance (Ice) — replace with <RunningBalanceSection {...sectionProps} /> */}
        <ReportSlot title="Running balance" />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto mb-4 flex max-w-6xl flex-col gap-1">
        <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Reports</h1>
        <p className="text-sm text-muted-foreground">Income, expenses and balance across your wallets.</p>
      </div>

      <ReportFilterBar wallets={walletOptions} filter={filter} isLoading={walletsQuery.isPending} />

      <div className="mx-auto mt-5 flex max-w-6xl flex-col gap-5">{content}</div>
    </main>
  );
}
