import type { Currency } from "./account";

export type GoalType = "savings" | "investment" | "expense_limit";

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  categoryId?: string;
  deadline?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  name: string;
  type: GoalType;
  targetAmount: number;
  currency: Currency;
  categoryId?: string;
  deadline?: string;
}

export interface GoalAllocation {
  id: string;
  goalId: string;
  movementId: string;
  amount: number;
  date: string;
}
