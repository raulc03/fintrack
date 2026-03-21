"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useGoal } from "@/hooks/use-goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

const typeLabels = {
  savings: "Savings",
  investment: "Investment",
  expense_limit: "Expense Limit",
};

export default function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { goal, allocations, loading } = useGoal(id);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Goal not found.</p>
      </div>
    );
  }

  const progress =
    goal.targetAmount > 0
      ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
      : 0;

  const remaining = goal.targetAmount - goal.currentAmount;
  const isOverBudget =
    goal.type === "expense_limit" && goal.currentAmount > goal.targetAmount;

  return (
    <>
      <header className="flex items-center gap-3 h-14 px-4 md:px-6 border-b border-border">
        <Link
          href="/goals"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">{goal.name}</h1>
        <Badge variant="outline">{typeLabels[goal.type]}</Badge>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>
                {goal.type === "expense_limit" ? "Spent" : "Saved"}:{" "}
                <span className="font-medium">
                  {formatCurrency(goal.currentAmount, goal.currency)}
                </span>
              </span>
              <span>
                {goal.type === "expense_limit" ? "Limit" : "Target"}:{" "}
                <span className="font-medium">
                  {formatCurrency(goal.targetAmount, goal.currency)}
                </span>
              </span>
            </div>
            <Progress
              value={progress}
              className={isOverBudget ? "[&>div]:bg-red-500" : ""}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{progress.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Progress</p>
              </div>
              <div>
                <p
                  className={`text-2xl font-bold ${isOverBudget ? "text-red-500" : remaining > 0 ? "text-muted-foreground" : "text-green-500"}`}
                >
                  {formatCurrency(Math.abs(remaining), goal.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOverBudget
                    ? "Over budget"
                    : goal.type === "expense_limit"
                      ? "Remaining"
                      : remaining > 0
                        ? "To go"
                        : "Completed"}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {goal.deadline
                    ? format(new Date(goal.deadline), "MMM yyyy")
                    : "No date"}
                </p>
                <p className="text-xs text-muted-foreground">Deadline</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {allocations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(a.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-500">
                        +{formatCurrency(a.amount, goal.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
