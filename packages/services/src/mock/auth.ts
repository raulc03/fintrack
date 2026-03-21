import type { AuthResponse, LoginInput, SignupInput, User } from "@finance/types";
import type { IAuthService } from "../types";

const USERS_KEY = "fintrack_users";
const SESSION_KEY = "fintrack_session";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

function encode(password: string): string {
  return btoa(password);
}

function getStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export class MockAuthService implements IAuthService {
  async login(input: LoginInput): Promise<AuthResponse> {
    const users = getStoredUsers();
    const user = users.find((u) => u.email === input.email.toLowerCase());
    if (!user || user.passwordHash !== encode(input.password)) {
      throw new Error("Invalid email or password");
    }
    const session: AuthResponse = {
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      token: generateId(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async signup(input: SignupInput): Promise<AuthResponse> {
    const users = getStoredUsers();
    if (users.some((u) => u.email === input.email.toLowerCase())) {
      throw new Error("Email already in use");
    }
    const newUser: StoredUser = {
      id: generateId(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: encode(input.password),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveStoredUsers(users);

    const session: AuthResponse = {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      token: generateId(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  getSession(): AuthResponse | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }
}
