"use client";

import type { GoalHistory } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currency";

interface BudgetHistoryCardProps {
  history: GoalHistory[];
}

export function BudgetHistoryCard({ history }: BudgetHistoryCardProps) {
  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Budget Consumption History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {history.map((goal) => (
          <section key={goal.goalId} className="space-y-3 border-b border-border pb-5 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{goal.goalName}</p>
                <p className="text-xs text-muted-foreground">
                  Monthly spend against {formatCurrency(goal.targetAmount, goal.currency)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {goal.months.map((month) => {
                const progress = Math.min(month.progressPercent, 100);
                const isOver = month.progressPercent > 100;
                return (
                  <div key={month.month} className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{month.monthLabel}</span>
                      <span className={`text-xs font-medium ${isOver ? "text-red-400" : "text-muted-foreground"}`}>
                        {month.progressPercent.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={progress} className={`mt-2 ${isOver ? "progress-gradient-red" : "progress-gradient-yellow"}`} />
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(month.spentAmount, goal.currency)} spent</span>
                      <span>{formatCurrency(month.targetAmount, goal.currency)} budget</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
