"use client";

import Link from "next/link";
import type { Goal } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

interface GoalsProgressProps {
  goals: Goal[];
}

export function GoalsProgress({ goals }: GoalsProgressProps) {
  const activeGoals = goals.filter(
    (g) => g.isActive && g.type !== "expense_limit"
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Savings & Investments
        </CardTitle>
        <Link
          href="/goals"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {activeGoals.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No active goals.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {activeGoals.map((g) => {
              const progress =
                g.targetAmount > 0
                  ? Math.min(
                      (g.currentAmount / g.targetAmount) * 100,
                      100
                    )
                  : 0;
              return (
                <div key={g.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progress} className="progress-gradient-green" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(g.currentAmount, g.currency)}</span>
                    <span>{formatCurrency(g.targetAmount, g.currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
