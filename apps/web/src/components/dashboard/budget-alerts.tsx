"use client";

import type { Goal } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currency";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface BudgetAlertsProps {
  goals: Goal[];
}

export function BudgetAlerts({ goals }: BudgetAlertsProps) {
  const expenseLimits = goals.filter(
    (g) => g.isActive && g.type === "expense_limit"
  );

  if (expenseLimits.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Expense Limits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {expenseLimits.map((g) => {
            const progress =
              g.targetAmount > 0
                ? (g.currentAmount / g.targetAmount) * 100
                : 0;
            const isOver = progress > 100;
            const isWarning = progress > 80 && !isOver;
            const isOk = !isOver && !isWarning;

            const statusColor = isOver
              ? "text-red-500"
              : isWarning
                ? "text-yellow-500"
                : "text-green-500";

            return (
              <div key={g.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {isOver && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    {isWarning && (
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                    )}
                    {isOk && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                    {g.name}
                  </span>
                  <span className={`text-xs font-medium ${statusColor}`}>
                    {Math.min(progress, 100).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(progress, 100)}
                  className={
                    isOver
                      ? "mt-3 progress-gradient-red"
                      : isWarning
                        ? "mt-3 progress-gradient-yellow"
                        : "mt-3 progress-gradient-green"
                  }
                />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className={statusColor}>
                    {formatCurrency(g.currentAmount, g.currency)}
                  </span>
                  <span>{formatCurrency(g.targetAmount, g.currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
