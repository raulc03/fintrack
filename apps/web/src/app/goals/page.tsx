"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalCardCreate } from "@/components/goals/goal-card-create";
import { BudgetHistoryCard } from "@/components/goals/budget-history-card";
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
  const { goals, expenseLimitHistory, loading, create, update, remove } = useGoals();
  const { categories } = useCategories();
  const [creatingType, setCreatingType] = useState<GoalType | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const savingsGoals = goals.filter((g) => g.type === "savings");
  const investmentGoals = goals.filter((g) => g.type === "investment");
  const expenseLimitGoals = goals.filter((g) => g.type === "expense_limit");

  const handleCreate = async (data: CreateGoalInput) => {
    await create(data);
    setCreatingType(null);
    toast.success("Goal created");
  };

  const handleUpdate = async (goalId: string, data: CreateGoalInput) => {
    await update(goalId, data);
    setEditingGoalId(null);
    toast.success("Goal updated");
  };

  const handleDelete = async (goalId: string, goalName: string) => {
    if (!confirm(`Delete "${goalName}"? This cannot be undone.`)) return;

    await remove(goalId);
    setEditingGoalId((current) => (current === goalId ? null : current));
    toast.success("Goal deleted");
  };

  const handleCancel = () => {
    setCreatingType(null);
    setEditingGoalId(null);
  };

  const handleEdit = (goalId: string | null) => {
    setCreatingType(null);
    setEditingGoalId(goalId);
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
              Set savings targets, investment targets, or expense limits.
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
              editingGoalId={editingGoalId}
              onCreateSave={handleCreate}
              onUpdateSave={handleUpdate}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onCreateCancel={handleCancel}
            />
            <GoalSection
              title="Investments"
              goals={investmentGoals}
              creating={creatingType === "investment"}
              creatingType="investment"
              expenseCategories={expenseCategories}
              editingGoalId={editingGoalId}
              onCreateSave={handleCreate}
              onUpdateSave={handleUpdate}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onCreateCancel={handleCancel}
            />
            <GoalSection
              title="Expense Limits"
              goals={expenseLimitGoals}
              creating={creatingType === "expense_limit"}
              creatingType="expense_limit"
              expenseCategories={expenseCategories}
              editingGoalId={editingGoalId}
              onCreateSave={handleCreate}
              onUpdateSave={handleUpdate}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onCreateCancel={handleCancel}
            />
            <BudgetHistoryCard history={expenseLimitHistory} />
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
  editingGoalId,
  onCreateSave,
  onUpdateSave,
  onDelete,
  onEdit,
  onCreateCancel,
}: {
  title: string;
  goals: ReturnType<typeof useGoals>["goals"];
  creating: boolean;
  creatingType: GoalType;
  expenseCategories: ReturnType<typeof useCategories>["categories"];
  editingGoalId: string | null;
  onCreateSave: (data: CreateGoalInput) => void | Promise<void>;
  onUpdateSave: (goalId: string, data: CreateGoalInput) => void | Promise<void>;
  onDelete: (goalId: string, goalName: string) => void | Promise<void>;
  onEdit: (goalId: string | null) => void;
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
          editingGoalId === goal.id ? (
            <GoalCardCreate
              key={goal.id}
              type={goal.type}
              expenseCategories={expenseCategories}
              initialValues={{
                name: goal.name,
                targetAmount: goal.targetAmount,
                currency: goal.currency,
                categoryId: goal.categoryId,
                deadline: goal.deadline,
              }}
              onSave={(data) => onUpdateSave(goal.id, data)}
              onCancel={onCreateCancel}
            />
          ) : (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => onEdit(goal.id)}
              onDelete={() => onDelete(goal.id, goal.name)}
            />
          )
        ))}
      </div>
    </div>
  );
}
