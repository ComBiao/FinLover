import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// TODO: replace hardcoded balance/goal/spend figures with a
// `useDashboardData` react-query hook once GET /api/transactions and
// GET /api/goals exist.

export function SummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-[1.4fr_1fr_1fr]">
      <Card className="rounded-2xl bg-gradient-pastel-a shadow-sm">
        <CardContent className="flex h-full flex-col justify-between gap-3 py-1">
          <div className="text-[11.5px] font-bold tracking-wide text-foreground/70 uppercase">
            Total balance
          </div>
          <div className="text-3xl font-extrabold text-foreground">
            ฿48,290.00
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-card px-2.5 py-1 text-xs font-bold text-success">
              +12.4% this month
            </span>
            <svg
              width="100"
              height="30"
              viewBox="0 0 100 30"
              role="img"
              aria-label="Balance trending up 12.4 percent this month"
              className="shrink-0"
            >
              <polyline
                points="0,24 18,20 34,22 50,12 68,15 84,5 100,8"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="py-1">
          <div className="text-[11.5px] font-bold tracking-wide text-muted-foreground uppercase">
            Savings goal
          </div>
          <div className="mt-2 text-sm font-bold text-foreground">
            Emergency fund
          </div>
          <Progress
            value={62}
            aria-label="Emergency fund savings goal, 62 percent complete"
            className="mt-2.5"
          />
          <div className="mt-2 text-xs text-muted-foreground">
            ฿12,400 of ฿20,000 · 62%
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="py-1">
          <div className="text-[11.5px] font-bold tracking-wide text-muted-foreground uppercase">
            Spent this month
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground">
            ฿9,180
          </div>
          <div className="mt-2 text-xs font-semibold text-destructive">
            ↑ 6% vs last month
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
