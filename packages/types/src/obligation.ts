import type { Currency } from "./account";

export interface Obligation {
  id: string;
  name: string;
  bucket: "necessity" | "desire" | "save_invest";
  categoryId: string;
  estimatedAmount: number;
  baseAmount?: number;
  carryoverAmount?: number;
  currency: Currency;
  dueDay: number;
  isPaid: boolean;
  linkedMovementId?: string;
  linkedMovementAmount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObligationInput {
  name: string;
  bucket: "necessity" | "desire" | "save_invest";
  categoryId: string;
  estimatedAmount: number;
  currency: Currency;
  dueDay: number;
}

export interface UpdateObligationInput {
  name?: string;
  bucket?: "necessity" | "desire" | "save_invest";
  categoryId?: string;
  estimatedAmount?: number;
  dueDay?: number;
}

export interface ObligationSummary {
  currency: Currency;
  totalObligations: number;
  paidAmount: number;
  pendingAmount: number;
  coveragePercent: number;
  currentBalance: number;
  freeAfterObligations: number;
}

export interface ObligationHistoryItem {
  obligationId: string;
  name: string;
  currency: Currency;
  dueAmount: number;
  paidAmount: number;
  isPaid: boolean;
}

export interface ObligationHistoryMonth {
  month: string;
  monthLabel: string;
  totalDue: number;
  totalPaid: number;
  items: ObligationHistoryItem[];
}
