"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatBahtCompact, formatBahtFixed } from "@/features/reports/format";
import type { RunningBalanceResponse } from "@/shared/contracts";
import {
  balanceDomain,
  hasNegativeBalance,
  pointLabel,
  tickLabel,
  toRunningBalanceChartData,
  type RunningBalanceChartPoint,
} from "@/features/reports/runningBalanceFormat";

const LINE_COLOR = "var(--primary)";
const AXIS_TICK = { fontSize: 12, fill: "var(--muted-foreground)" };
/** Dots only while there are few enough points for them not to blur into the line. */
const DOT_LIMIT = 31;

function BalanceTooltip({
  active,
  payload,
  interval,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  interval: RunningBalanceResponse["interval"];
}) {
  const point = payload?.[0]?.payload as RunningBalanceChartPoint | undefined;
  if (!active || !point) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-semibold">{point.isOpening ? "Opening balance" : pointLabel(point.label, interval)}</p>
      <p className="font-medium tabular-nums">{formatBahtFixed(point.balance)}</p>
    </div>
  );
}

/**
 * Balance over time (US8-5). The line starts at the opening balance, which is
 * also marked with a dashed reference line; a line at 0 appears once the
 * balance goes negative. The Y axis does not have to start at 0.
 */
export function RunningBalanceChart({ data }: { data: RunningBalanceResponse }) {
  const points = toRunningBalanceChartData(data);
  const unit = data.interval === "weekly" ? "week" : "day";

  return (
    <div className="h-80 w-full" role="img" aria-label={`Running balance per ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickFormatter={tickLabel}
            interval="preserveStartEnd"
            minTickGap={24}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={AXIS_TICK}
          />
          <YAxis
            domain={balanceDomain(data)}
            tickFormatter={(value: number) => formatBahtCompact(value)}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={AXIS_TICK}
          />
          <Tooltip content={(props) => <BalanceTooltip active={props.active} payload={props.payload} interval={data.interval} />} />
          <ReferenceLine
            y={data.openingBalance}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: "Opening balance", position: "insideTopRight", fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          {hasNegativeBalance(data) ? <ReferenceLine y={0} stroke="var(--destructive)" /> : null}
          <Line
            type="linear"
            dataKey="balance"
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={points.length <= DOT_LIMIT}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
