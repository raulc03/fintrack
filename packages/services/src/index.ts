import type { IFinanceService, IAuthService } from "./types";

// Toggle these imports to switch between mock and real API:
import { ApiFinanceService as ServiceImpl } from "./api";
import { ApiAuthService as AuthImpl } from "./api/auth";
// import { MockFinanceService as ServiceImpl } from "./mock";
// import { MockAuthService as AuthImpl } from "./mock/auth";

export const financeService: IFinanceService = new ServiceImpl();
export const authService: IAuthService = new AuthImpl();
export type { IFinanceService, IAuthService, PaginatedResponse } from "./types";
