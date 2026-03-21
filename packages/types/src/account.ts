export type Currency = "USD" | "PEN";

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  initialBalance: number;
  currentBalance: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  currency: Currency;
  initialBalance: number;
  color?: string;
}

export interface UpdateAccountInput {
  name?: string;
  color?: string;
  initialBalance?: number;
}
