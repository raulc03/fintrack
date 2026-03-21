import { parseVoiceInput } from "./voice-parser";
import type { Category } from "@finance/types";

const categories: Category[] = [
  { id: "food", name: "Food & Groceries", type: "expense", icon: "shopping-cart", color: "#ef4444", isDefault: true, createdAt: "" },
  { id: "transport", name: "Transport", type: "expense", icon: "car", color: "#f97316", isDefault: true, createdAt: "" },
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "#22c55e", isDefault: true, createdAt: "" },
  { id: "freelance", name: "Freelance", type: "income", icon: "laptop", color: "#3b82f6", isDefault: true, createdAt: "" },
];

describe("parseVoiceInput", () => {
  describe("type detection", () => {
    it("detects expense from 'spent'", () => {
      const result = parseVoiceInput("spent 50 on groceries", categories);
      expect(result.type).toBe("expense");
    });

    it("detects expense from 'paid'", () => {
      const result = parseVoiceInput("paid 120 for utilities", categories);
      expect(result.type).toBe("expense");
    });

    it("detects income from 'received'", () => {
      const result = parseVoiceInput("received 4500 salary", categories);
      expect(result.type).toBe("income");
    });

    it("detects income from 'earned'", () => {
      const result = parseVoiceInput("earned 800 from freelance", categories);
      expect(result.type).toBe("income");
    });

    it("defaults to expense when no keywords match", () => {
      const result = parseVoiceInput("50 dollars coffee", categories);
      expect(result.type).toBe("expense");
    });
  });

  describe("amount extraction", () => {
    it("extracts dollar-prefixed amount", () => {
      const result = parseVoiceInput("spent $42.50 on food", categories);
      expect(result.amount).toBe(42.5);
    });

    it("extracts plain number", () => {
      const result = parseVoiceInput("paid 100 for food", categories);
      expect(result.amount).toBe(100);
    });

    it("returns null when no number present", () => {
      const result = parseVoiceInput("bought some groceries", categories);
      expect(result.amount).toBeNull();
    });
  });

  describe("category matching", () => {
    it("matches direct category name", () => {
      const result = parseVoiceInput("spent 50 on transport", categories);
      expect(result.categoryMatch).toBe("transport");
    });

    it("matches via alias (grocery → food)", () => {
      const result = parseVoiceInput("spent 50 at grocery", categories);
      expect(result.categoryMatch).toBe("food");
    });

    it("matches via alias (uber → transport)", () => {
      const result = parseVoiceInput("uber ride 15", categories);
      expect(result.categoryMatch).toBe("transport");
    });

    it("returns null when no category matches", () => {
      const result = parseVoiceInput("spent 50 on something random", categories);
      expect(result.categoryMatch).toBeNull();
    });

    it("only matches categories of the detected type", () => {
      const result = parseVoiceInput("received 4500 salary", categories);
      expect(result.type).toBe("income");
      expect(result.categoryMatch).toBe("salary");
    });
  });

  describe("description", () => {
    it("preserves original transcript", () => {
      const result = parseVoiceInput("spent 50 on food", categories);
      expect(result.description).toBe("spent 50 on food");
    });

    it("trims whitespace", () => {
      const result = parseVoiceInput("  spent 50  ", categories);
      expect(result.description).toBe("spent 50");
    });
  });
});
