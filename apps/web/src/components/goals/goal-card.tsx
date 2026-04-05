"use client";

import { useRouter } from "next/navigation";
import type { Goal } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const router = useRouter();
  const progress =
    goal.targetAmount > 0
      ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
      : 0;

  const isOverBudget =
    goal.type === "expense_limit" && goal.currentAmount > goal.targetAmount;

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, [role='menuitem']")) return;
    router.push(`/goals/${goal.id}`);
  };

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:bg-accent/50 hover:shadow-lg"
      onClick={handleCardClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
        <CardTitle className="min-w-0 text-sm font-medium truncate">{goal.name}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={typeBadgeVariant[goal.type]}>
            {typeLabels[goal.type]}
          </Badge>
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-36">
                {onEdit && (
                  <DropdownMenuItem onClick={(event) => {
                    event.stopPropagation();
                    onEdit();
                  }}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem variant="destructive" onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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
  );
}
