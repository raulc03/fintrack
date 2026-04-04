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
import { useSettings } from "@/hooks/use-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { grid } from "@/lib/responsive";
import { toast } from "sonner";
import type { CreateMovementInput, Movement } from "@finance/types";
import { MovementForm } from "@/components/movements/movement-form";

export default function DashboardPage() {
  const { accounts, loading: accountsLoading, refetch: refetchAccounts } = useAccounts();
  const { movements, loading: movementsLoading, create, update } = useMovements();
  const { goals, loading: goalsLoading, refetch: refetchGoals } = useGoals();
  const { categories } = useCategories();
  const { obligations, summaries: obligationSummaries, refetch: refetchObligations, link: linkObligation } = useObligations();
  const { settings } = useSettings();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
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
      <div className="space-y-4 p-3 pb-24 md:space-y-6 md:p-6">
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
            <BalanceSummary accounts={accounts} settings={settings} />
            <div className="grid gap-4 lg:grid-cols-2">
              <ObligationsSummary obligations={obligations} summaries={obligationSummaries} />
              <GoalsProgress goals={goals} />
            </div>
            <BudgetAlerts goals={goals} />
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
              <SpendingChart refreshKey={chartKey} defaultCurrency={settings.mainCurrency} />
              <RecentMovements movements={movements} onEdit={(m) => { setEditingMovement(m); setEditFormOpen(true); }} />
            </div>
          </>
        )}
      </div>

      <MovementForm
        open={editFormOpen}
        onOpenChange={(open) => { setEditFormOpen(open); if (!open) setEditingMovement(null); }}
        onSubmit={async (data) => {
          if (!editingMovement) return;
          try {
            const { obligationId, exchangeRate, ...movementData } = data;
            await update(editingMovement.id, movementData);
            refetchAccounts();
            refetchGoals();
            refetchObligations();
            setChartKey((k) => k + 1);
            toast.success("Movement updated");
          } catch {
            toast.error("Failed to update movement");
          }
        }}
        accounts={accounts}
        categories={categories}
        editingMovement={editingMovement}
      />
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
