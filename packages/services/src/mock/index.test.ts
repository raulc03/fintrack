import { MockFinanceService } from "./index";

describe("MockFinanceService", () => {
  let service: MockFinanceService;

  beforeEach(() => {
    service = new MockFinanceService();
  });

  describe("AccountService", () => {
    it("getAll returns seed accounts", async () => {
      const accounts = await service.accounts.getAll();
      expect(accounts.length).toBeGreaterThan(0);
    });

    it("getById returns correct account", async () => {
      const accounts = await service.accounts.getAll();
      const account = await service.accounts.getById(accounts[0].id);
      expect(account.id).toBe(accounts[0].id);
    });

    it("getById throws for nonexistent id", async () => {
      await expect(service.accounts.getById("nonexistent")).rejects.toThrow();
    });

    it("create adds a new account", async () => {
      const created = await service.accounts.create({
        name: "Test Account",
        currency: "USD",
        initialBalance: 1000,
      });
      expect(created.name).toBe("Test Account");
      expect(created.currentBalance).toBe(1000);
      expect(created.id).toBeTruthy();
    });

    it("update adjusts currentBalance when initialBalance changes", async () => {
      const accounts = await service.accounts.getAll();
      const original = accounts[0];
      const updated = await service.accounts.update(original.id, {
        initialBalance: original.initialBalance + 500,
      });
      expect(updated.currentBalance).toBe(original.currentBalance + 500);
    });

    it("delete removes account", async () => {
      const accounts = await service.accounts.getAll();
      const count = accounts.length;
      await service.accounts.delete(accounts[0].id);
      const remaining = await service.accounts.getAll();
      expect(remaining.length).toBe(count - 1);
    });

    it("delete throws for nonexistent id", async () => {
      await expect(service.accounts.delete("nonexistent")).rejects.toThrow();
    });
  });

  describe("MovementService", () => {
    it("getAll returns paginated response", async () => {
      const result = await service.movements.getAll();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
    });

    it("getAll sorts by date descending", async () => {
      const result = await service.movements.getAll();
      for (let i = 1; i < result.data.length; i++) {
        expect(new Date(result.data[i - 1].date).getTime())
          .toBeGreaterThanOrEqual(new Date(result.data[i].date).getTime());
      }
    });

    it("getAll filters by type", async () => {
      const result = await service.movements.getAll({ type: "income" });
      expect(result.data.every((m) => m.type === "income")).toBe(true);
    });

    it("getAll filters by accountId", async () => {
      const accounts = await service.accounts.getAll();
      const result = await service.movements.getAll({ accountId: accounts[0].id });
      expect(result.data.length).toBeGreaterThan(0);
    });

    it("getAll paginates correctly", async () => {
      const page1 = await service.movements.getAll(undefined, 1, 3);
      const page2 = await service.movements.getAll(undefined, 2, 3);
      expect(page1.data.length).toBeLessThanOrEqual(3);
      expect(page2.page).toBe(2);
      if (page2.data.length > 0) {
        expect(page1.data[0].id).not.toBe(page2.data[0].id);
      }
    });

    it("create updates account balance for income", async () => {
      const accounts = await service.accounts.getAll();
      const before = accounts[0].currentBalance;
      await service.movements.create({
        type: "income",
        amount: 100,
        description: "Test income",
        date: new Date().toISOString(),
        accountId: accounts[0].id,
        categoryId: "cat-9",
      });
      const after = await service.accounts.getById(accounts[0].id);
      expect(after.currentBalance).toBe(before + 100);
    });

    it("create updates account balance for expense", async () => {
      const accounts = await service.accounts.getAll();
      const before = accounts[0].currentBalance;
      await service.movements.create({
        type: "expense",
        amount: 50,
        description: "Test expense",
        date: new Date().toISOString(),
        accountId: accounts[0].id,
        categoryId: "cat-1",
      });
      const after = await service.accounts.getById(accounts[0].id);
      expect(after.currentBalance).toBe(before - 50);
    });

    it("getMonthlySummary calculates correctly", async () => {
      const summary = await service.movements.getMonthlySummary(2026, 3);
      expect(summary.income).toBeGreaterThan(0);
      expect(summary.expense).toBeGreaterThan(0);
      expect(summary.net).toBe(summary.income - summary.expense);
    });

    it("getMonthlySummary filters by currency", async () => {
      const usd = await service.movements.getMonthlySummary(2026, 3, "USD");
      const pen = await service.movements.getMonthlySummary(2026, 3, "PEN");
      // USD and PEN should have different totals
      expect(usd.income).not.toBe(pen.income);
    });
  });

  describe("CategoryService", () => {
    it("getAll returns all categories", async () => {
      const categories = await service.categories.getAll();
      expect(categories.length).toBeGreaterThan(0);
    });

    it("getAll filters by type", async () => {
      const income = await service.categories.getAll("income");
      expect(income.every((c) => c.type === "income")).toBe(true);
    });

    it("create adds category with defaults", async () => {
      const created = await service.categories.create({
        name: "Test",
        type: "expense",
      });
      expect(created.name).toBe("Test");
      expect(created.icon).toBe("tag");
      expect(created.isDefault).toBe(false);
    });

    it("delete removes category", async () => {
      const created = await service.categories.create({ name: "ToDelete", type: "expense" });
      await service.categories.delete(created.id);
      await expect(service.categories.getAll()).resolves.not.toContainEqual(
        expect.objectContaining({ id: created.id })
      );
    });
  });

  describe("GoalService", () => {
    it("getAll returns seed goals", async () => {
      const goals = await service.goals.getAll();
      expect(goals.length).toBeGreaterThan(0);
    });

    it("create initializes with currentAmount 0", async () => {
      const goal = await service.goals.create({
        name: "Test Goal",
        type: "savings",
        targetAmount: 5000,
        currency: "USD",
      });
      expect(goal.currentAmount).toBe(0);
      expect(goal.isActive).toBe(true);
    });

    it("allocate increases currentAmount", async () => {
      const goals = await service.goals.getAll();
      const goal = goals[0];
      const before = goal.currentAmount;
      await service.goals.allocate(goal.id, 100, "mov-1");
      const after = await service.goals.getById(goal.id);
      expect(after.currentAmount).toBe(before + 100);
    });

    it("getAllocations returns allocations for goal", async () => {
      const allocations = await service.goals.getAllocations("goal-1");
      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations.every((a) => a.goalId === "goal-1")).toBe(true);
    });
  });
});
