"use client";

import { ArrowDownLeft, ArrowUpRight, Scale, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportError, errorMessageOf } from "@/features/reports/components/ReportStates";
import { formatBahtFixed } from "@/features/reports/format";
import { useReportSummary } from "@/features/reports/hooks/useReportSummary";
import type { ReportFilter } from "@/features/reports/types";
import { cn } from "@/lib/utils";

type Tone = "income" | "expense" | "net-positive" | "net-negative" | "neutral";

const AMOUNT_TONE: Record<Tone, string> = {
  income: "text-success",
  expense: "text-destructive",
  "net-positive": "text-success",
  "net-negative": "text-destructive",
  neutral: "text-foreground",
};

const ICON_TONE: Record<Tone, string> = {
  income: "bg-success-bg text-success",
  expense: "bg-danger-bg text-destructive",
  "net-positive": "bg-success-bg text-success",
  "net-negative": "bg-danger-bg text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

function SummaryCard({ label, value, tone, icon: Icon }: { label: string; value: string; tone: Tone; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn("mt-1 truncate text-2xl font-extrabold tabular-nums", AMOUNT_TONE[tone])}>{value}</p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", ICON_TONE[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

function netTone(net: number): Tone {
  if (net > 0) return "net-positive";
  if (net < 0) return "net-negative";
  return "neutral";
}

/** Total Income / Total Expenses / Net Cash Flow for the whole filter (US8-2). */
export function ReportSummaryCards({ filter }: { filter: ReportFilter | null }) {
  const query = useReportSummary(filter);
  const summary = query.data;

  if (summary === undefined && query.isPending) {
    return (
      <div role="status" aria-label="Loading" aria-busy="true" className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (summary === undefined) {
    return (
      <Card>
        <CardContent>
          <ReportError message={errorMessageOf(query.error)} onRetry={() => void query.refetch()} />
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-label="Summary" className="flex flex-col gap-3">
      <div className={cn("grid gap-3 transition-opacity sm:grid-cols-3", query.isPlaceholderData && "opacity-60")}>
        <SummaryCard label="Total Income" value={formatBahtFixed(summary.totalIncome)} tone="income" icon={ArrowDownLeft} />
        <SummaryCard label="Total Expenses" value={formatBahtFixed(summary.totalExpense)} tone="expense" icon={ArrowUpRight} />
        <SummaryCard
          label="Net Cash Flow"
          value={formatBahtFixed(summary.netCashFlow, { sign: true })}
          tone={netTone(summary.netCashFlow)}
          icon={Scale}
        />
      </div>
      {summary.transactionCount === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No transactions recorded in this period</p>
      ) : null}
    </section>
  );
}
