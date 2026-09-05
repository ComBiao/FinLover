import { Card, CardContent } from "@/components/ui/card";

const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

/**
 * Renders a line chart showing spending trends over six months (March to August).
 * TODO: replace with real monthly spend totals from a `useDashboardData`
 * react-query hook once GET /api/transactions/summary exists.
 */
export function SpendingTrendChart() {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="py-1">
        <div className="mb-3.5 text-sm font-bold text-foreground">
          Spending trend
        </div>
        <svg
          width="100%"
          height="120"
          viewBox="0 0 460 120"
          preserveAspectRatio="none"
          role="img"
          aria-label="Spending trend line chart from March to August, trending upward overall"
        >
          <polyline
            points="0,90 65,70 130,80 195,50 260,60 325,25 390,40 460,15"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-1.5 flex justify-between text-[11.5px] text-muted-foreground">
          {MONTHS.map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
