import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  LayoutDashboard,
  Wallet,
  Tag,
  Target,
  Receipt,
} from "lucide-react";
import type { MovementType, Category } from "@finance/types";

/**
 * Shared movement type configuration — icons, colors, labels.
 * Used by movement tables, recent movements, and anywhere movement types are displayed.
 */
export const MOVEMENT_TYPE_CONFIG: Record<
  MovementType,
  { icon: typeof ArrowDownLeft; color: string; label: string }
> = {
  income: { icon: ArrowDownLeft, color: "text-green-500", label: "Income" },
  expense: { icon: ArrowUpRight, color: "text-red-500", label: "Expense" },
  transfer: {
    icon: ArrowLeftRight,
    color: "text-blue-500",
    label: "Transfer",
  },
};

/**
 * Shared color palettes for creation forms.
 */
export const ACCOUNT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

/**
 * Application route paths — single source of truth.
 */
export const ROUTES = {
  HOME: "/",
  ACCOUNTS: "/accounts",
  MOVEMENTS: "/movements",
  CATEGORIES: "/categories",
  GOALS: "/goals",
  OBLIGATIONS: "/obligations",
  SETTINGS: "/settings",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
} as const;

export const PUBLIC_ROUTES = [ROUTES.LOGIN, ROUTES.SIGNUP];

/**
 * Navigation items — shared between sidebar and mobile nav.
 */
export const NAV_ITEMS = [
  { href: ROUTES.HOME, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.ACCOUNTS, label: "Accounts", icon: Wallet },
  { href: ROUTES.MOVEMENTS, label: "Movements", icon: ArrowLeftRight },
  { href: ROUTES.CATEGORIES, label: "Categories", icon: Tag },
  { href: ROUTES.GOALS, label: "Goals", icon: Target },
  { href: ROUTES.OBLIGATIONS, label: "Bills", icon: Receipt },
];

/**
 * Default pagination size.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Filter categories by movement type.
 * Shared between movement form and quick-add sheet.
 */
export function filterCategoriesByType(
  categories: Category[],
  type: MovementType
): Category[] {
  if (type === "transfer") return categories.filter((c) => c.name === "Transfer");
  return categories.filter((c) => c.type === type);
}

/**
 * Get balance change color class.
 */
export function getBalanceColorClass(amount: number): string {
  if (amount > 0) return "text-green-500";
  if (amount < 0) return "text-red-500";
  return "text-muted-foreground";
}

/**
 * Coverage thresholds and helpers for obligation/budget progress bars.
 */
export const COVERAGE_THRESHOLDS = { GOOD: 80, WARNING: 50 } as const;

export function getCoverageColorClass(percent: number): string {
  if (percent >= COVERAGE_THRESHOLDS.GOOD) return "text-green-500";
  if (percent >= COVERAGE_THRESHOLDS.WARNING) return "text-yellow-500";
  return "text-red-500";
}

export function getCoverageProgressClass(percent: number): string {
  if (percent >= COVERAGE_THRESHOLDS.GOOD) return "progress-gradient-green";
  if (percent >= COVERAGE_THRESHOLDS.WARNING) return "progress-gradient-yellow";
  return "progress-gradient-red";
}

/**
 * Supported currencies — single source of truth.
 */
export const SUPPORTED_CURRENCIES = ["USD", "PEN"] as const;
