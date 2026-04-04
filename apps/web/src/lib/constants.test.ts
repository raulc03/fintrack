import { filterCategoriesByType, getBalanceColorClass, resolveMovementCategoryId } from "./constants";
import type { Category } from "@finance/types";

const mockCategories: Category[] = [
  { id: "c1", name: "Food", type: "expense", icon: "shopping-cart", color: "#ef4444", isDefault: true, createdAt: "" },
  { id: "c2", name: "Rent", type: "expense", icon: "home", color: "#8b5cf6", isDefault: true, createdAt: "" },
  { id: "c3", name: "Salary", type: "income", icon: "briefcase", color: "#22c55e", isDefault: true, createdAt: "" },
  { id: "c4", name: "Transfer", type: "expense", icon: "arrow-left-right", color: "#64748b", isDefault: true, createdAt: "" },
];

describe("filterCategoriesByType", () => {
  it("returns expense categories for expense type", () => {
    const result = filterCategoriesByType(mockCategories, "expense");
    expect(result.every((c) => c.type === "expense")).toBe(true);
    expect(result.length).toBe(3); // Food, Rent, Transfer
  });

  it("returns income categories for income type", () => {
    const result = filterCategoriesByType(mockCategories, "income");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Salary");
  });

  it("returns only Transfer category for transfer type", () => {
    const result = filterCategoriesByType(mockCategories, "transfer");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Transfer");
  });

  it("returns empty array when no categories match", () => {
    const result = filterCategoriesByType([], "expense");
    expect(result).toHaveLength(0);
  });
});

describe("getBalanceColorClass", () => {
  it("returns green for positive amounts", () => {
    expect(getBalanceColorClass(100)).toBe("text-green-500");
  });

  it("returns red for negative amounts", () => {
    expect(getBalanceColorClass(-50)).toBe("text-red-500");
  });

  it("returns muted for zero", () => {
    expect(getBalanceColorClass(0)).toBe("text-muted-foreground");
  });
});

describe("resolveMovementCategoryId", () => {
  it("returns the selected category for non-transfer movements", () => {
    expect(resolveMovementCategoryId(mockCategories, "expense", "c1")).toBe("c1");
  });

  it("returns the Transfer category for transfers", () => {
    expect(resolveMovementCategoryId(mockCategories, "transfer", "")).toBe("c4");
  });

  it("returns an empty string when the Transfer category is missing", () => {
    expect(resolveMovementCategoryId(mockCategories.slice(0, 3), "transfer", "")).toBe("");
  });
});
