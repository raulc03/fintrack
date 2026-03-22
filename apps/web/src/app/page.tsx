"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import dynamic from "next/dynamic";
import { BalanceSummary } from "@/components/dashboard/balance-summary";

const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart").then((m) => m.SpendingChart),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse bg-muted rounded-lg" /> }
);
import { RecentMovements } from "@/components/dashboard/recent-movements";
import { GoalsProgress } from "@/components/dashboard/goals-progress";
import { BudgetAlerts } from "@/components/dashboard/budget-alerts";
import { ObligationsSummary } from "@/components/dashboard/obligations-summary";
import { QuickAddFab } from "@/components/dashboard/quick-add-fab";
import { QuickAddSheet } from "@/components/dashboard/quick-add-sheet";
import { useAccounts } from "@/hooks/use-accounts";
import { useMovements } from "@/hooks/use-movements";
import { useGoals } from "@/hooks/use-goals";
import { useCategories } from "@/hooks/use-categories";
import { useObligations } from "@/hooks/use-obligations";
import { Skeleton } from "@/components/ui/skeleton";
import { grid } from "@/lib/responsive";
import { toast } from "sonner";
import type { CreateMovementInput } from "@finance/types";

export default function DashboardPage() {
  const { accounts, loading: accountsLoading, refetch: refetchAccounts } = useAccounts();
  const { movements, loading: movementsLoading, create } = useMovements();
  const { goals, loading: goalsLoading, refetch: refetchGoals } = useGoals();
  const { categories } = useCategories();
  const { obligations, summaries: obligationSummaries, refetch: refetchObligations, link: linkObligation } = useObligations();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  const loading = accountsLoading || movementsLoading || goalsLoading;

  const handleCreate = useCallback(
    async (input: CreateMovementInput & { obligationId?: string }) => {
      const { obligationId, ...movementData } = input;
      const result = await create(movementData);
      if (obligationId && result?.id) {
        try {
          await linkObligation(obligationId, result.id);
        } catch {
          toast.warning("Movement created, but linking to obligation failed.");
        }
      }
      refetchAccounts();
      refetchGoals();
      refetchObligations();
      setChartKey((k) => k + 1);
      return result;
    },
    [create, linkObligation, refetchAccounts, refetchGoals, refetchObligations]
  );

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-4 md:p-6 space-y-6 pb-24">
        {loading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-[100px]" />
              <Skeleton className="h-[100px]" />
            </div>
            <Skeleton className="h-[300px]" />
            <div className={grid.split}>
              <Skeleton className="h-[300px]" />
              <Skeleton className="h-[300px]" />
            </div>
          </>
        ) : (
          <>
            <BalanceSummary accounts={accounts} />
            <SpendingChart refreshKey={chartKey} />
            <div className={grid.split}>
              <RecentMovements movements={movements} />
              <div className="space-y-4">
                <ObligationsSummary obligations={obligations} summaries={obligationSummaries} />
                <GoalsProgress goals={goals} />
                <BudgetAlerts goals={goals} />
              </div>
            </div>
          </>
        )}
      </div>

      <QuickAddFab onClick={() => setQuickAddOpen(true)} />
      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        accounts={accounts}
        categories={categories}
        obligations={obligations}
        onSubmit={handleCreate}
      />
    </>
  );
}
