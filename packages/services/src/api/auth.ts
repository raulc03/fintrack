import type { AuthResponse, LoginInput, SignupInput } from "@finance/types";
import type { IAuthService } from "../types";
import { apiRequest } from "./client";

const SESSION_KEY = "fintrack_session";

export class ApiAuthService implements IAuthService {
  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(response));
    }
    return response;
  }

  async signup(input: SignupInput): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(response));
    }
    return response;
  }

  getSession(): AuthResponse | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
    }
  }
}
