import type { Currency } from "./account";

export type MovementType = "income" | "expense" | "transfer";

export interface Movement {
  id: string;
  type: MovementType;
  amount: number;
  currency: Currency;
  description: string;
  date: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMovementInput {
  type: MovementType;
  amount: number;
  description: string;
  date: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId: string;
}

export interface MovementFilters {
  accountId?: string;
  categoryId?: string;
  type?: MovementType;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}
