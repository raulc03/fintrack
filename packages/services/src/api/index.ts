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
import { apiRequest } from "./client";

class ApiAccountService implements IAccountService {
  async getAll(): Promise<Account[]> {
    return apiRequest<Account[]>("/api/accounts");
  }

  async getById(id: string): Promise<Account> {
    return apiRequest<Account>(`/api/accounts/${id}`);
  }

  async create(input: CreateAccountInput): Promise<Account> {
    return apiRequest<Account>("/api/accounts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async update(id: string, input: UpdateAccountInput): Promise<Account> {
    return apiRequest<Account>(`/api/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/accounts/${id}`, { method: "DELETE" });
  }
}

class ApiMovementService implements IMovementService {
  async getAll(
    filters?: MovementFilters,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Movement>> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (filters?.type) params.set("type", filters.type);
    if (filters?.accountId) params.set("accountId", filters.accountId);
    if (filters?.categoryId) params.set("categoryId", filters.categoryId);
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.minAmount !== undefined) params.set("minAmount", String(filters.minAmount));
    if (filters?.maxAmount !== undefined) params.set("maxAmount", String(filters.maxAmount));

    return apiRequest<PaginatedResponse<Movement>>(`/api/movements?${params}`);
  }

  async getById(id: string): Promise<Movement> {
    return apiRequest<Movement>(`/api/movements/${id}`);
  }

  async create(input: CreateMovementInput): Promise<Movement> {
    return apiRequest<Movement>("/api/movements", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async update(id: string, input: Partial<CreateMovementInput>): Promise<Movement> {
    return apiRequest<Movement>(`/api/movements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/movements/${id}`, { method: "DELETE" });
  }

  async getByAccount(accountId: string): Promise<Movement[]> {
    return apiRequest<Movement[]>(`/api/movements/account/${accountId}`);
  }

  async getMonthlySummary(
    year: number,
    month: number,
    currency?: Currency
  ): Promise<{ income: number; expense: number; net: number }> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (currency) params.set("currency", currency);
    return apiRequest(`/api/movements/summary?${params}`);
  }
}

class ApiCategoryService implements ICategoryService {
  async getAll(type?: CategoryType): Promise<Category[]> {
    const params = type ? `?type=${type}` : "";
    return apiRequest<Category[]>(`/api/categories${params}`);
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    return apiRequest<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async update(id: string, input: Partial<CreateCategoryInput>): Promise<Category> {
    return apiRequest<Category>(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/categories/${id}`, { method: "DELETE" });
  }
}

class ApiGoalService implements IGoalService {
  async getAll(): Promise<Goal[]> {
    return apiRequest<Goal[]>("/api/goals");
  }

  async getById(id: string): Promise<Goal> {
    return apiRequest<Goal>(`/api/goals/${id}`);
  }

  async create(input: CreateGoalInput): Promise<Goal> {
    return apiRequest<Goal>("/api/goals", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async update(id: string, input: Partial<CreateGoalInput>): Promise<Goal> {
    return apiRequest<Goal>(`/api/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/goals/${id}`, { method: "DELETE" });
  }

  async allocate(
    goalId: string,
    amount: number,
    movementId: string
  ): Promise<GoalAllocation> {
    return apiRequest<GoalAllocation>(`/api/goals/${goalId}/allocate`, {
      method: "POST",
      body: JSON.stringify({ amount, movementId }),
    });
  }

  async getAllocations(goalId: string): Promise<GoalAllocation[]> {
    return apiRequest<GoalAllocation[]>(`/api/goals/${goalId}/allocations`);
  }
}

export class ApiFinanceService implements IFinanceService {
  accounts = new ApiAccountService();
  movements = new ApiMovementService();
  categories = new ApiCategoryService();
  goals = new ApiGoalService();
}
