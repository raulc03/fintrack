"use client";

import { AlertTriangle, CheckCircle2, PiggyBank } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatCurrencyWithMainConversion } from "@/lib/currency";
import { useBudgetSummary } from "@/hooks/use-budget-summary";
import { useSettings } from "@/hooks/use-settings";

export function BudgetRuleSummary() {
  const { settings } = useSettings();
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
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg font-semibold sm:text-xl">50 / 30 / 20 This Month</CardTitle>
          <p className="mt-2 text-base text-muted-foreground">
            Fixed commitments and variable activity are grouped inside each bucket for this month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge
            variant={overLimitBuckets.length > 0 || summary.unclassifiedExpenseAmount > 0 ? "outline" : "secondary"}
            className="max-w-full px-3 py-1 text-sm whitespace-normal break-words"
          >
            {formatCurrencyWithMainConversion(summary.income, summary.currency, settings.mainCurrency, settings.usdToPenRate)} income
          </Badge>
          <Link href="/buckets" className={buttonVariants({ variant: "ghost", size: "sm", className: "text-sm" })}>
            Open buckets
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 xl:grid-cols-3">
          {summary.buckets.map((bucket) => {
            const progress = Math.min(bucket.progressPercent, 100);
            const toneClass = bucket.isOver ? "text-red-500" : "text-muted-foreground";

            return (
              <Link
                key={bucket.key}
                href={`/buckets?bucket=${bucket.key}`}
                className="block rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-border hover:bg-muted/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{bucket.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Target {formatCurrencyWithMainConversion(bucket.targetAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${toneClass}`}>{bucket.progressPercent.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className={`mt-3 ${bucket.isOver ? "progress-gradient-red" : "progress-gradient-green"}`} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Fixed</p>
                    <p className="mt-1.5 text-base font-medium text-foreground">{formatCurrencyWithMainConversion(bucket.fixedAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Variable</p>
                    <p className="mt-1.5 text-base font-medium text-foreground">{formatCurrencyWithMainConversion(bucket.variableAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatCurrencyWithMainConversion(bucket.actualAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)} total</span>
                  <span className={bucket.remainingAmount < 0 ? "text-red-500" : "text-muted-foreground"}>
                    {bucket.remainingAmount >= 0
                      ? `${formatCurrencyWithMainConversion(bucket.remainingAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)} left`
                      : `${formatCurrencyWithMainConversion(Math.abs(bucket.remainingAmount), summary.currency, settings.mainCurrency, settings.usdToPenRate)} over`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="flex items-center gap-2 text-base font-medium">
            {recommendations[0].includes("within") ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : recommendations[0].includes("debt") ? (
              <PiggyBank className="h-4 w-4 text-amber-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            What to do next
          </div>
          <div className="mt-3 space-y-2 text-base text-muted-foreground">
            {recommendations.map((recommendation) => (
              <p key={recommendation}>{recommendation}</p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
