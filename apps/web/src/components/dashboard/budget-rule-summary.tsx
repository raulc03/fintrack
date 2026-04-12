"use client";

import { AlertTriangle, CheckCircle2, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { useBudgetSummary } from "@/hooks/use-budget-summary";

export function BudgetRuleSummary() {
  const { summary, loading, error } = useBudgetSummary();

  if (loading) {
    return <Skeleton className="h-[280px] rounded-xl" />;
  }

  if (error || !summary) {
    return null;
  }

  const overLimitBuckets = summary.buckets.filter((bucket) => bucket.isOver);
  const recommendations: string[] = [];

  if (summary.hasDebtPriority) {
    recommendations.push("Carryover debt is active, so the 20% bucket should go to payoff before investing.");
  }

  if (summary.unclassifiedExpenseAmount > 0) {
    recommendations.push(`You still have ${formatCurrency(summary.unclassifiedExpenseAmount, summary.currency)} in unclassified expenses.`);
  }

  if (overLimitBuckets.length > 0) {
    recommendations.push(`${overLimitBuckets[0].label} is already over the recommended monthly target.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("All tracked buckets are within the current 50/30/20 targets.");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-medium">50 / 30 / 20 This Month</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Built from recorded income in {summary.currency} and bucketed spending for this month.
          </p>
        </div>
        <Badge variant={overLimitBuckets.length > 0 || summary.unclassifiedExpenseAmount > 0 ? "outline" : "secondary"}>
          {formatCurrency(summary.income, summary.currency)} income
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 xl:grid-cols-3">
          {summary.buckets.map((bucket) => {
            const progress = Math.min(bucket.progressPercent, 100);
            const toneClass = bucket.isOver ? "text-red-500" : "text-muted-foreground";

            return (
              <div key={bucket.key} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{bucket.label}</p>
                    <p className="text-xs text-muted-foreground">Target {formatCurrency(bucket.targetAmount, summary.currency)}</p>
                  </div>
                  <span className={`text-xs font-medium ${toneClass}`}>{bucket.progressPercent.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className={`mt-3 ${bucket.isOver ? "progress-gradient-red" : "progress-gradient-green"}`} />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(bucket.actualAmount, summary.currency)} actual</span>
                  <span className={bucket.remainingAmount < 0 ? "text-red-500" : "text-muted-foreground"}>
                    {bucket.remainingAmount >= 0 ? `${formatCurrency(bucket.remainingAmount, summary.currency)} left` : `${formatCurrency(Math.abs(bucket.remainingAmount), summary.currency)} over`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            {recommendations[0].includes("within") ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : recommendations[0].includes("debt") ? (
              <PiggyBank className="h-4 w-4 text-amber-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            What to do next
          </div>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {recommendations.map((recommendation) => (
              <p key={recommendation}>{recommendation}</p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
