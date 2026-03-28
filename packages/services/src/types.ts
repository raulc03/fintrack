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
  AuthResponse,
  LoginInput,
  SignupInput,
  Obligation,
  CreateObligationInput,
  UpdateObligationInput,
  ObligationSummary,
  UserSettings,
  UpdateSettingsInput,
} from "@finance/types";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IAccountService {
  getAll(): Promise<Account[]>;
  getById(id: string): Promise<Account>;
  create(input: CreateAccountInput): Promise<Account>;
  update(id: string, input: UpdateAccountInput): Promise<Account>;
  delete(id: string): Promise<void>;
}

export interface IMovementService {
  getAll(
    filters?: MovementFilters,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Movement>>;
  getById(id: string): Promise<Movement>;
  create(input: CreateMovementInput): Promise<Movement>;
  update(id: string, input: Partial<CreateMovementInput>): Promise<Movement>;
  delete(id: string): Promise<void>;
  getByAccount(accountId: string): Promise<Movement[]>;
  getMonthlySummary(
    year: number,
    month: number,
    currency?: Currency
  ): Promise<{ income: number; expense: number; net: number }>;
}

export interface ICategoryService {
  getAll(type?: CategoryType): Promise<Category[]>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, input: Partial<CreateCategoryInput>): Promise<Category>;
  delete(id: string): Promise<void>;
}

export interface IGoalService {
  getAll(): Promise<Goal[]>;
  getById(id: string): Promise<Goal>;
  create(input: CreateGoalInput): Promise<Goal>;
  update(id: string, input: Partial<CreateGoalInput>): Promise<Goal>;
  delete(id: string): Promise<void>;
  allocate(
    goalId: string,
    amount: number,
    movementId: string
  ): Promise<GoalAllocation>;
  getAllocations(goalId: string): Promise<GoalAllocation[]>;
}

export interface IAuthService {
  login(input: LoginInput): Promise<AuthResponse>;
  signup(input: SignupInput): Promise<AuthResponse>;
  getSession(): AuthResponse | null;
  logout(): void;
}

export interface IObligationService {
  getAll(): Promise<Obligation[]>;
  getSummary(): Promise<ObligationSummary[]>;
  create(input: CreateObligationInput): Promise<Obligation>;
  update(id: string, input: UpdateObligationInput): Promise<Obligation>;
  delete(id: string): Promise<void>;
  link(id: string, movementId: string | null): Promise<Obligation>;
  getAvailableMovements(): Promise<Movement[]>;
}

export interface ISettingsService {
  get(): Promise<UserSettings>;
  update(input: UpdateSettingsInput): Promise<UserSettings>;
}

export interface IFinanceService {
  accounts: IAccountService;
  movements: IMovementService;
  categories: ICategoryService;
  goals: IGoalService;
  obligations: IObligationService;
  settings: ISettingsService;
}
