import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  Currency,
  Movement,
  CreateMovementInput,
  MovementFilters,
  Category,
  CategoryType,
  CreateCategoryInput,
  Goal,
  CreateGoalInput,
  GoalAllocation,
} from "@finance/types";
import type {
  IFinanceService,
  IAccountService,
  IMovementService,
  ICategoryService,
  IGoalService,
  PaginatedResponse,
} from "../types";
import {
  seedAccounts,
  seedCategories,
  seedMovements,
  seedGoals,
  seedAllocations,
} from "./data";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

class MockAccountService implements IAccountService {
  private accounts: Map<string, Account>;

  constructor() {
    this.accounts = new Map(seedAccounts.map((a) => [a.id, { ...a }]));
  }

  async getAll(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getById(id: string): Promise<Account> {
    const account = this.accounts.get(id);
    if (!account) throw new Error(`Account not found: ${id}`);
    return account;
  }

  async create(input: CreateAccountInput): Promise<Account> {
    const account: Account = {
      id: generateId(),
      name: input.name,
      currency: input.currency,
      initialBalance: input.initialBalance,
      currentBalance: input.initialBalance,
      color: input.color ?? "#3b82f6",
      createdAt: now(),
      updatedAt: now(),
    };
    this.accounts.set(account.id, account);
    return account;
  }

  async update(id: string, input: UpdateAccountInput): Promise<Account> {
    const account = await this.getById(id);
    const updated = { ...account, ...input, updatedAt: now() };
    if (input.initialBalance !== undefined) {
      const delta = input.initialBalance - account.initialBalance;
      updated.currentBalance = account.currentBalance + delta;
    }
    this.accounts.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.accounts.has(id)) throw new Error(`Account not found: ${id}`);
    this.accounts.delete(id);
  }

  updateBalance(id: string, delta: number): void {
    const account = this.accounts.get(id);
    if (account) {
      account.currentBalance += delta;
      account.updatedAt = now();
    }
  }
}

class MockMovementService implements IMovementService {
  private movements: Map<string, Movement>;
  private accountService: MockAccountService;

  constructor(accountService: MockAccountService) {
    this.movements = new Map(seedMovements.map((m) => [m.id, { ...m }]));
    this.accountService = accountService;
  }

  async getAll(
    filters?: MovementFilters,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Movement>> {
    let items = Array.from(this.movements.values());

    if (filters) {
      if (filters.accountId) {
        items = items.filter(
          (m) =>
            m.accountId === filters.accountId ||
            m.destinationAccountId === filters.accountId
        );
      }
      if (filters.categoryId) {
        items = items.filter((m) => m.categoryId === filters.categoryId);
      }
      if (filters.type) {
        items = items.filter((m) => m.type === filters.type);
      }
      if (filters.dateFrom) {
        items = items.filter((m) => m.date >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        items = items.filter((m) => m.date <= filters.dateTo!);
      }
      if (filters.minAmount !== undefined) {
        items = items.filter((m) => m.amount >= filters.minAmount!);
      }
      if (filters.maxAmount !== undefined) {
        items = items.filter((m) => m.amount <= filters.maxAmount!);
      }
    }

    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const total = items.length;
    const start = (page - 1) * pageSize;
    const data = items.slice(start, start + pageSize);

    return { data, total, page, pageSize };
  }

  async getById(id: string): Promise<Movement> {
    const movement = this.movements.get(id);
    if (!movement) throw new Error(`Movement not found: ${id}`);
    return movement;
  }

  async create(input: CreateMovementInput): Promise<Movement> {
    const account = await this.accountService.getById(input.accountId);
    const movement: Movement = {
      id: generateId(),
      type: input.type,
      amount: input.amount,
      currency: account.currency,
      description: input.description,
      date: input.date,
      accountId: input.accountId,
      destinationAccountId: input.destinationAccountId,
      categoryId: input.categoryId,
      createdAt: now(),
      updatedAt: now(),
    };
    this.movements.set(movement.id, movement);

    // Update account balances
    if (input.type === "income") {
      this.accountService.updateBalance(input.accountId, input.amount);
    } else if (input.type === "expense") {
      this.accountService.updateBalance(input.accountId, -input.amount);
    } else if (input.type === "transfer" && input.destinationAccountId) {
      this.accountService.updateBalance(input.accountId, -input.amount);
      this.accountService.updateBalance(
        input.destinationAccountId,
        input.amount
      );
    }

    return movement;
  }

  async update(
    id: string,
    input: Partial<CreateMovementInput>
  ): Promise<Movement> {
    const movement = await this.getById(id);
    const updated = { ...movement, ...input, updatedAt: now() };
    this.movements.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.movements.has(id)) throw new Error(`Movement not found: ${id}`);
    this.movements.delete(id);
  }

  async getByAccount(accountId: string): Promise<Movement[]> {
    return Array.from(this.movements.values())
      .filter(
        (m) =>
          m.accountId === accountId || m.destinationAccountId === accountId
      )
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }

  async getMonthlySummary(
    year: number,
    month: number,
    currency?: Currency
  ): Promise<{ income: number; expense: number; net: number }> {
    let items = Array.from(this.movements.values()).filter((m) => {
      const d = new Date(m.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    if (currency) {
      items = items.filter((m) => m.currency === currency);
    }

    const income = items
      .filter((m) => m.type === "income")
      .reduce((sum, m) => sum + m.amount, 0);
    const expense = items
      .filter((m) => m.type === "expense")
      .reduce((sum, m) => sum + m.amount, 0);

    return { income, expense, net: income - expense };
  }
}

class MockCategoryService implements ICategoryService {
  private categories: Map<string, Category>;

  constructor() {
    this.categories = new Map(seedCategories.map((c) => [c.id, { ...c }]));
  }

  async getAll(type?: CategoryType): Promise<Category[]> {
    const items = Array.from(this.categories.values());
    if (type) return items.filter((c) => c.type === type);
    return items;
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const category: Category = {
      id: generateId(),
      name: input.name,
      type: input.type,
      icon: input.icon ?? "tag",
      color: input.color ?? "#64748b",
      isDefault: false,
      createdAt: now(),
    };
    this.categories.set(category.id, category);
    return category;
  }

  async update(
    id: string,
    input: Partial<CreateCategoryInput>
  ): Promise<Category> {
    const category = this.categories.get(id);
    if (!category) throw new Error(`Category not found: ${id}`);
    const updated = { ...category, ...input };
    this.categories.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.categories.has(id))
      throw new Error(`Category not found: ${id}`);
    this.categories.delete(id);
  }
}

class MockGoalService implements IGoalService {
  private goals: Map<string, Goal>;
  private allocations: Map<string, GoalAllocation>;

  constructor() {
    this.goals = new Map(seedGoals.map((g) => [g.id, { ...g }]));
    this.allocations = new Map(
      seedAllocations.map((a) => [a.id, { ...a }])
    );
  }

  async getAll(): Promise<Goal[]> {
    return Array.from(this.goals.values());
  }

  async getById(id: string): Promise<Goal> {
    const goal = this.goals.get(id);
    if (!goal) throw new Error(`Goal not found: ${id}`);
    return goal;
  }

  async create(input: CreateGoalInput): Promise<Goal> {
    const goal: Goal = {
      id: generateId(),
      name: input.name,
      type: input.type,
      targetAmount: input.targetAmount,
      currentAmount: 0,
      currency: input.currency,
      categoryId: input.categoryId,
      deadline: input.deadline,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    };
    this.goals.set(goal.id, goal);
    return goal;
  }

  async update(id: string, input: Partial<CreateGoalInput>): Promise<Goal> {
    const goal = await this.getById(id);
    const updated = { ...goal, ...input, updatedAt: now() };
    this.goals.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.goals.has(id)) throw new Error(`Goal not found: ${id}`);
    this.goals.delete(id);
  }

  async allocate(
    goalId: string,
    amount: number,
    movementId: string
  ): Promise<GoalAllocation> {
    const goal = await this.getById(goalId);
    goal.currentAmount += amount;
    goal.updatedAt = now();
    this.goals.set(goalId, goal);

    const allocation: GoalAllocation = {
      id: generateId(),
      goalId,
      movementId,
      amount,
      date: now(),
    };
    this.allocations.set(allocation.id, allocation);
    return allocation;
  }

  async getAllocations(goalId: string): Promise<GoalAllocation[]> {
    return Array.from(this.allocations.values()).filter(
      (a) => a.goalId === goalId
    );
  }
}

export class MockFinanceService implements IFinanceService {
  accounts: MockAccountService;
  movements: MockMovementService;
  categories: MockCategoryService;
  goals: MockGoalService;

  constructor() {
    this.accounts = new MockAccountService();
    this.movements = new MockMovementService(this.accounts);
    this.categories = new MockCategoryService();
    this.goals = new MockGoalService();
  }
}
