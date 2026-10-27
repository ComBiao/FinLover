"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { resolveCategoryIcon } from "@/features/categories/categoryIcons";
import type { CategoryDistributionItem, CategoryDistributionResponse } from "@/shared/contracts";
import { ReportEmpty } from "@/features/reports/components/ReportStates";
import { formatBahtFixed } from "@/features/reports/format";

type DistributionSide = CategoryDistributionResponse["income"];

/** Slice colour for a category without one ("Other (No Category)"). */
export const NO_COLOR = "var(--muted-foreground)";

export const sliceColor = (item: CategoryDistributionItem) => item.color ?? NO_COLOR;

/** `categoryId` is null for the synthetic "no category" row, so fall back to a fixed key. */
export const itemKey = (item: CategoryDistributionItem) => item.categoryId ?? "no-category";

const percentLabel = (percentage: number) => `${percentage.toFixed(1)}%`;

function DonutTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
  const item = payload?.[0]?.payload as CategoryDistributionItem | undefined;
  if (!active || !item) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-semibold">{item.name}</p>
      <p className="flex items-center justify-between gap-6">
        <span className="font-medium tabular-nums">{formatBahtFixed(item.amount)}</span>
        <span className="tabular-nums text-muted-foreground">{percentLabel(item.percentage)}</span>
      </p>
    </div>
  );
}

/** One donut with the side's total in the middle and a legend list underneath. */
export function DonutCard({
  title,
  side,
  emptyMessage,
}: {
  title: string;
  side: DistributionSide;
  emptyMessage: string;
}) {
  return (
    <section aria-label={title} className="rounded-lg border border-border p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {side.total === 0 ? (
        <ReportEmpty message={emptyMessage} className="py-8" />
      ) : (
        <>
          <div
            className="relative mx-auto h-56 w-full max-w-xs"
            role="img"
            aria-label={`${title} by category, total ${formatBahtFixed(side.total)}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={side.items}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="95%"
                  paddingAngle={side.items.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {side.items.map((item) => (
                    <Cell key={itemKey(item)} fill={sliceColor(item)} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <DonutTooltip active={props.active} payload={props.payload} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-base font-bold tabular-nums">{formatBahtFixed(side.total)}</span>
            </div>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {side.items.map((item) => {
              const Icon = item.icon ? resolveCategoryIcon(item.icon) : undefined;
              return (
                <li key={itemKey(item)} className="flex items-center gap-2 text-sm">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: sliceColor(item) }}
                    aria-hidden="true"
                  >
                    {Icon ? <Icon className="size-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="tabular-nums">{formatBahtFixed(item.amount)}</span>
                  <span className="w-14 text-right tabular-nums text-muted-foreground">
                    {percentLabel(item.percentage)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
