import type { Currency } from "./account";

export interface BudgetBucketSummary {
  key: "necessity" | "desire" | "save_invest";
  label: string;
  targetAmount: number;
  actualAmount: number;
  remainingAmount: number;
  progressPercent: number;
  percentOfIncome: number;
  isOver: boolean;
}

export interface BudgetSummary {
  currency: Currency;
  income: number;
  unclassifiedExpenseAmount: number;
  hasDebtPriority: boolean;
  buckets: BudgetBucketSummary[];
}
