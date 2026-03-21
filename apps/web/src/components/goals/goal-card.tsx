"use client";

import Link from "next/link";
import type { Goal } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

const typeLabels = {
  savings: "Savings",
  investment: "Investment",
  expense_limit: "Expense Limit",
};

const typeBadgeVariant = {
  savings: "default" as const,
  investment: "secondary" as const,
  expense_limit: "outline" as const,
};

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const progress =
    goal.targetAmount > 0
      ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
      : 0;

  const isOverBudget =
    goal.type === "expense_limit" && goal.currentAmount > goal.targetAmount;

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className="hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{goal.name}</CardTitle>
          <Badge variant={typeBadgeVariant[goal.type]}>
            {typeLabels[goal.type]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(goal.currentAmount, goal.currency)}
            </span>
            <span className="font-medium">
              {formatCurrency(goal.targetAmount, goal.currency)}
            </span>
          </div>
          <Progress
            value={progress}
            className={isOverBudget ? "progress-gradient-red" : "progress-gradient-green"}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.toFixed(0)}%</span>
            {goal.deadline && (
              <span>
                Due {format(new Date(goal.deadline), "MMM dd, yyyy")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
