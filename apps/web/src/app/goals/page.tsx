"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalCardCreate } from "@/components/goals/goal-card-create";
import { useGoals } from "@/hooks/use-goals";
import { useCategories } from "@/hooks/use-categories";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Target, Plus, PiggyBank, TrendingUp, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { grid } from "@/lib/responsive";
import type { GoalType, CreateGoalInput } from "@finance/types";

const GOAL_TYPES: { value: GoalType; label: string; icon: typeof PiggyBank }[] = [
  { value: "savings", label: "Savings", icon: PiggyBank },
  { value: "investment", label: "Investment", icon: TrendingUp },
  { value: "expense_limit", label: "Expense Limit", icon: ShieldAlert },
];

export default function GoalsPage() {
  const { goals, loading, create } = useGoals();
  const { categories } = useCategories();
  const [creatingType, setCreatingType] = useState<GoalType | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const savingsGoals = goals.filter((g) => g.type === "savings");
  const investmentGoals = goals.filter((g) => g.type === "investment");
  const expenseLimitGoals = goals.filter((g) => g.type === "expense_limit");

  const handleCreate = async (data: CreateGoalInput) => {
    await create(data);
    setCreatingType(null);
    toast.success("Goal created");
  };

  const handleCancel = () => {
    setCreatingType(null);
  };

  return (
    <>
      <Header
        title="Goals"
        customAction={
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Goal
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-48">
              {GOAL_TYPES.map((t) => (
                <DropdownMenuItem
                  key={t.value}
                  onClick={() => setCreatingType(t.value)}
                  className="cursor-pointer"
                >
                  <t.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="p-4 md:p-6 space-y-8">
        {loading ? (
          <div className={grid.cards}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[160px] rounded-lg" />
            ))}
          </div>
        ) : goals.length === 0 && !creatingType ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No goals yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Set savings targets, investment goals, or expense limits.
            </p>
          </div>
        ) : (
          <>
            <GoalSection
              title="Savings"
              goals={savingsGoals}
              creating={creatingType === "savings"}
              creatingType="savings"
              expenseCategories={expenseCategories}
              onCreateSave={handleCreate}
              onCreateCancel={handleCancel}
            />
            <GoalSection
              title="Investments"
              goals={investmentGoals}
              creating={creatingType === "investment"}
              creatingType="investment"
              expenseCategories={expenseCategories}
              onCreateSave={handleCreate}
              onCreateCancel={handleCancel}
            />
            <GoalSection
              title="Expense Limits"
              goals={expenseLimitGoals}
              creating={creatingType === "expense_limit"}
              creatingType="expense_limit"
              expenseCategories={expenseCategories}
              onCreateSave={handleCreate}
              onCreateCancel={handleCancel}
            />
          </>
        )}
      </div>
    </>
  );
}

function GoalSection({
  title,
  goals,
  creating,
  creatingType,
  expenseCategories,
  onCreateSave,
  onCreateCancel,
}: {
  title: string;
  goals: ReturnType<typeof useGoals>["goals"];
  creating: boolean;
  creatingType: GoalType;
  expenseCategories: ReturnType<typeof useCategories>["categories"];
  onCreateSave: (data: CreateGoalInput) => void;
  onCreateCancel: () => void;
}) {
  if (goals.length === 0 && !creating) return null;

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3">
        {title}
      </h2>
      <div className={grid.cards}>
        {creating && (
          <GoalCardCreate
            type={creatingType}
            expenseCategories={expenseCategories}
            onSave={onCreateSave}
            onCancel={onCreateCancel}
          />
        )}
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
