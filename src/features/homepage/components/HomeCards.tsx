import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { CATEGORY_STYLES, resolveChipTone } from "@/components/chipColor";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatBaht } from "@/lib/utils";
import type { HomeSavingGoal, HomeTopCategory } from "@/features/homepage/services/homeService";

type TotalBalanceCardProps = {
  walletLabel: string;
  hasWallets: boolean;
  totalBalance: number;
  savingGoal: HomeSavingGoal | null;
};

/** Pink-lilac gradient card for the current (month-independent) combined or per-wallet balance, with an optional embedded saving-goal section. */
export function TotalBalanceCard({
  walletLabel,
  hasWallets,
  totalBalance,
  savingGoal,
}: TotalBalanceCardProps) {
  return (
    <Card className="rounded-2xl bg-gradient-pastel-a shadow-sm">
      <CardContent className="flex h-full flex-col gap-3.5 py-1">
        {!hasWallets ? (
          <>
            <div className="text-base font-bold tracking-wide text-muted-foreground uppercase">
              Total balance
            </div>
            <p className="text-sm font-medium text-foreground/70">
              Create a wallet to see your balance
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-bold tracking-wide text-muted-foreground uppercase">
                Total balance
              </span>
              <span className="w-fit rounded-full bg-card/70 px-2.5 py-1 text-xs font-semibold text-foreground/70">
                {walletLabel} · today
              </span>
            </div>
            <div className="text-3xl font-extrabold text-foreground sm:text-4xl">
              {formatBaht(Math.abs(totalBalance))}
            </div>

            {savingGoal ? (
              <div className="mt-auto flex flex-col gap-2.5 border-t border-foreground/10 pt-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-foreground">Saving goal</span>
                  <span className="text-xs font-semibold text-foreground/70">
                    {savingGoal.reached
                      ? "Goal reached"
                      : `${formatBaht(savingGoal.remaining)} to go`}
                  </span>
                </div>
                <Progress value={savingGoal.percent} className="[&>div]:bg-card/80" />
                <span className="text-xs text-foreground/80">
                  {savingGoal.walletName} · {formatBaht(Math.abs(savingGoal.current))} of{" "}
                  {formatBaht(savingGoal.goal)} · {savingGoal.percent}%
                </span>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

type AmountCardProps = {
  label: string;
  amount: number;
  emptyLabel: string;
  tone: "expense" | "income";
};

function AmountCard({ label, amount, emptyLabel, tone }: AmountCardProps) {
  const Icon = tone === "expense" ? ArrowDownRight : ArrowUpRight;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex h-full flex-col gap-3.5 py-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span
            className={cn(
              "flex size-13 shrink-0 items-center justify-center rounded-full",
              tone === "expense" ? "bg-danger-bg text-destructive" : "bg-success-bg text-success"
            )}
          >
            <Icon className="size-6.5" />
          </span>
        </div>
        <div
          className={cn(
            "text-3xl font-extrabold",
            tone === "expense" ? "text-destructive" : "text-success"
          )}
        >
          {formatBaht(amount)}
        </div>
        {amount === 0 ? <span className="text-sm text-muted-foreground">{emptyLabel}</span> : null}
      </CardContent>
    </Card>
  );
}

export function SpentCard({ monthLabel, amount }: { monthLabel: string; amount: number }) {
  return (
    <AmountCard
      label={`Spent in ${monthLabel.toUpperCase()}`}
      amount={amount}
      emptyLabel="No spending recorded this month"
      tone="expense"
    />
  );
}

export function IncomeCard({ monthLabel, amount }: { monthLabel: string; amount: number }) {
  return (
    <AmountCard
      label={`Income in ${monthLabel.toUpperCase()}`}
      amount={amount}
      emptyLabel="No income recorded this month"
      tone="income"
    />
  );
}

type NetCardProps = {
  monthLabel: string;
  net: number;
  status: "surplus" | "overspending" | "even";
  income: number;
  expense: number;
};

const NET_TAG = {
  surplus: { label: "Surplus", className: "bg-success-bg text-success" },
  overspending: { label: "Overspending", className: "bg-danger-bg text-destructive" },
  even: { label: "Break-even", className: "bg-muted text-muted-foreground" },
} as const;

export function NetCard({ monthLabel, net, status, income, expense }: NetCardProps) {
  const tag = NET_TAG[status];
  const maxValue = Math.max(income, expense, 1);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex h-full flex-col gap-3.5 py-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold tracking-wide text-muted-foreground uppercase">
            Net in {monthLabel.toUpperCase()}
          </span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tag.className)}>
            {tag.label}
          </span>
        </div>
        <div
          className={cn(
            "text-3xl font-extrabold",
            status === "surplus" ? "text-success" : status === "overspending" ? "text-destructive" : "text-foreground"
          )}
        >
          {formatBaht(net, { sign: true })}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">Income</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${Math.round((income / maxValue) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">Expense</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-destructive"
                style={{ width: `${Math.round((expense / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type TopCategoriesCardProps = {
  monthLabel: string;
  topCategories: HomeTopCategory[];
};

export function TopCategoriesCard({ monthLabel, topCategories }: TopCategoriesCardProps) {
  return (
    <Card className="rounded-2xl shadow-sm md:col-span-2">
      <CardContent className="flex h-full flex-col gap-3 py-1">
        <span className="text-base font-bold tracking-wide text-muted-foreground uppercase">
          Top categories · {monthLabel.toUpperCase()}
        </span>
        {topCategories.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-muted px-5 py-6 text-center">
            <span className="text-sm font-semibold text-foreground">No spending in {monthLabel}</span>
            <span className="text-sm text-muted-foreground">
              Your top categories will show up once you record an expense.
            </span>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {topCategories.map((category) => {
              const Icon = category.icon;
              // TODO(backend): once GET /api/categories returns a real `color`
              // per category, this can drop the CATEGORY_STYLES fallback and
              // rely on `category.color` alone.
              const tone = category.categoryId
                ? resolveChipTone(category.color, CATEGORY_STYLES, category.categoryId)
                : undefined;
              return (
                <li
                  key={category.categoryId ?? "uncategorized"}
                  className="flex items-center gap-3.5 py-3"
                >
                  <span className="w-5 shrink-0 text-sm font-bold text-muted-foreground">
                    {category.rank}.
                  </span>
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      tone ? tone.className : "bg-muted text-muted-foreground"
                    )}
                    style={tone?.style}
                  >
                    {Icon ? <Icon className="size-4" /> : null}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">{category.name}</span>
                  <span className="text-base font-bold text-foreground">
                    {formatBaht(category.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
