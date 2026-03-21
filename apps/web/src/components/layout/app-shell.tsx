"use client";

import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex-1 flex flex-col min-h-screen">{children}</main>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0 overflow-x-hidden">
        {children}
      </main>
      <MobileNav />
    </>
  );
}
