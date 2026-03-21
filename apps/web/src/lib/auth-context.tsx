"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@finance/services";
import type { User, LoginInput, SignupInput } from "@finance/types";
import { PUBLIC_ROUTES, ROUTES } from "@/lib/constants";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check session on mount
  useEffect(() => {
    const session = authService.getSession();
    if (session) {
      setUser(session.user);
    }
    setIsLoading(false);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;
    const isPublic = (PUBLIC_ROUTES as readonly string[]).includes(pathname);

    if (!user && !isPublic) {
      router.replace(ROUTES.LOGIN);
    } else if (user && isPublic) {
      router.replace(ROUTES.HOME);
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await authService.login(input);
      setUser(response.user);
      router.replace(ROUTES.HOME);
    },
    [router]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const response = await authService.signup(input);
      setUser(response.user);
      router.replace(ROUTES.HOME);
    },
    [router]
  );

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    router.replace(ROUTES.LOGIN);
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
