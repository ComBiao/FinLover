import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { savingsGoal } from "@/mocks/mock-data";

/**
 * Displays progress toward the user's active savings goal.
 * TODO: replace hardcoded goal figures with a `useDashboardData`
 * react-query hook once GET /api/goals exists.
 */
export function SavingsGoal() {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="py-1">
        <div className="text-sm font-bold text-foreground">Savings goal</div>
        <div className="mt-1 text-sm text-muted-foreground">{savingsGoal.name}</div>
        <Progress
          value={savingsGoal.percent}
          aria-label={`${savingsGoal.name} savings goal, ${savingsGoal.percent} percent complete`}
          className="mt-3.5"
        />
        <div className="mt-2 text-xs text-muted-foreground">
          ฿{savingsGoal.current.toLocaleString()} of ฿{savingsGoal.target.toLocaleString()} ·{" "}
          {savingsGoal.percent}%
        </div>
      </CardContent>
    </Card>
  );
}
