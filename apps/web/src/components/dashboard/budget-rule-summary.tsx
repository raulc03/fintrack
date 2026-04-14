"use client";

import { AlertTriangle, CheckCircle2, PiggyBank } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatCurrencyWithMainConversion } from "@/lib/currency";
import { useBudgetSummary } from "@/hooks/use-budget-summary";
import { useSettings } from "@/hooks/use-settings";

const BUCKET_TONES = {
  necessity: {
    badge: "bg-rose-500/10 text-rose-200",
    fixed: "bg-rose-700",
    variable: "bg-rose-400",
  },
  desire: {
    badge: "bg-amber-400/10 text-amber-100",
    fixed: "bg-amber-600",
    variable: "bg-amber-300",
  },
  save_invest: {
    badge: "bg-emerald-500/10 text-emerald-200",
    fixed: "bg-emerald-700",
    variable: "bg-emerald-400",
  },
} as const;

function getSegmentPercent(amount: number, targetAmount: number) {
  if (targetAmount <= 0 || amount <= 0) return 0;
  return (amount / targetAmount) * 100;
}

function BudgetBucketBar({
  fixedPercent,
  variablePercent,
  leftPercent,
  fixedClassName,
  variableClassName,
}: {
  fixedPercent: number;
  variablePercent: number;
  leftPercent: number;
  fixedClassName: string;
  variableClassName: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80">
      <div className="flex h-4 w-full bg-muted/70">
        {fixedPercent > 0 ? <div className={fixedClassName} style={{ width: `${fixedPercent}%` }} /> : null}
        {variablePercent > 0 ? <div className={variableClassName} style={{ width: `${variablePercent}%` }} /> : null}
        {leftPercent > 0 ? <div className="bg-muted-foreground/25" style={{ width: `${leftPercent}%` }} /> : null}
      </div>
    </div>
  );
}

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
            const fixedPercent = getSegmentPercent(bucket.fixedAmount, bucket.targetAmount);
            const variablePercent = getSegmentPercent(bucket.variableAmount, bucket.targetAmount);
            const leftPercent = getSegmentPercent(Math.max(bucket.remainingAmount, 0), bucket.targetAmount);
            const toneClass = bucket.isOver ? "text-red-500" : "text-muted-foreground";
            const tones = BUCKET_TONES[bucket.key];

            return (
              <Link
                key={bucket.key}
                href={`/buckets?bucket=${bucket.key}`}
                className="block rounded-2xl border border-border/60 bg-muted/10 p-4 transition-colors hover:border-border hover:bg-muted/20"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tones.badge}`}>
                        {bucket.percentOfIncome.toFixed(0)}% of income
                      </div>
                      <p className="mt-3 text-lg font-semibold">{bucket.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Max monthly budget</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`text-sm font-medium ${toneClass}`}>{bucket.progressPercent.toFixed(0)}% used</p>
                      <p className="mt-1 text-base font-medium text-muted-foreground">
                        {bucket.remainingAmount >= 0 ? "Still available" : "Already over"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-2xl bg-background/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Spent this month</p>
                      <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1">
                        <span className="text-2xl font-semibold leading-none text-foreground sm:text-3xl">
                          {formatCurrencyWithMainConversion(bucket.actualAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)}
                        </span>
                        <span className="text-sm text-muted-foreground sm:pb-0.5">/
                          {" "}
                          {formatCurrencyWithMainConversion(bucket.targetAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-sm sm:items-end">
                      <span className="text-muted-foreground">Max</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrencyWithMainConversion(bucket.targetAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <BudgetBucketBar
                      fixedPercent={fixedPercent}
                      variablePercent={variablePercent}
                      leftPercent={leftPercent}
                      fixedClassName={tones.fixed}
                      variableClassName={tones.variable}
                    />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${tones.fixed}`} />
                        Fixed
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${tones.variable}`} />
                        Variable
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
                        Left
                      </span>
                      <span className={`ml-auto font-medium ${bucket.remainingAmount < 0 ? "text-red-500" : "text-foreground"}`}>
                        {bucket.remainingAmount >= 0
                          ? `${formatCurrencyWithMainConversion(bucket.remainingAmount, summary.currency, settings.mainCurrency, settings.usdToPenRate)} left`
                          : `${formatCurrencyWithMainConversion(Math.abs(bucket.remainingAmount), summary.currency, settings.mainCurrency, settings.usdToPenRate)} over`}
                      </span>
                    </div>
                  </div>
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
