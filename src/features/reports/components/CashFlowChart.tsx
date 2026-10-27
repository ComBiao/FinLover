"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { bucketTitle, tickLabel } from "@/features/reports/cashFlowFormat";
import { formatBahtCompact, formatBahtFixed } from "@/features/reports/format";
import type { CashFlowBucket, ReportInterval } from "@/features/reports/types";

/** Income is green and expense red, using the same theme tokens as the rest of the app. */
const INCOME_COLOR = "var(--success)";
const EXPENSE_COLOR = "var(--destructive)";

const UNIT: Record<ReportInterval, string> = { daily: "day", weekly: "week", monthly: "month" };

function CashFlowTooltip({
  active,
  payload,
  interval,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  interval: ReportInterval;
}) {
  const bucket = payload?.[0]?.payload as CashFlowBucket | undefined;
  if (!active || !bucket) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-semibold">{bucketTitle(bucket, interval)}</p>
      <p className="flex items-center justify-between gap-6" style={{ color: INCOME_COLOR }}>
        <span>Income</span>
        <span className="font-medium tabular-nums">{formatBahtFixed(bucket.income)}</span>
      </p>
      <p className="flex items-center justify-between gap-6" style={{ color: EXPENSE_COLOR }}>
        <span>Expense</span>
        <span className="font-medium tabular-nums">{formatBahtFixed(bucket.expense)}</span>
      </p>
    </div>
  );
}

/**
 * Grouped Income / Expense bars per bucket (US8-3). The Y axis starts at 0;
 * a bucket with no income simply draws a zero-height bar.
 */
export function CashFlowChart({ buckets, interval }: { buckets: CashFlowBucket[]; interval: ReportInterval }) {
  return (
    <div className="h-80 w-full" role="img" aria-label={`Income and expenses per ${UNIT[interval]}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickFormatter={(value: string) => tickLabel(value, interval)}
            interval="preserveStartEnd"
            minTickGap={16}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            domain={[0, "auto"]}
            tickFormatter={(value: number) => formatBahtCompact(value)}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={(props) => <CashFlowTooltip active={props.active} payload={props.payload} interval={interval} />} />
          <Legend verticalAlign="top" height={32} iconType="circle" />
          <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
