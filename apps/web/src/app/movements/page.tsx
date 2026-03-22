"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { MovementTable } from "@/components/movements/movement-table";
import { MovementFilters } from "@/components/movements/movement-filters";
import { MovementForm } from "@/components/movements/movement-form";
import { useMovements } from "@/hooks/use-movements";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useObligations } from "@/hooks/use-obligations";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import type { MovementType, MovementFilters as Filters } from "@finance/types";

export default function MovementsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState<{
    type?: MovementType;
    accountId?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const apiFilters: Filters = useMemo(
    () => ({
      type: filters.type,
      accountId: filters.accountId,
      categoryId: filters.categoryId,
      dateFrom: filters.dateFrom
        ? new Date(filters.dateFrom).toISOString()
        : undefined,
      dateTo: filters.dateTo
        ? new Date(filters.dateTo).toISOString()
        : undefined,
    }),
    [filters]
  );

  const { movements, loading, create, remove } = useMovements(apiFilters);
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { obligations, link: linkObligation } = useObligations();

  const handleCreate = async (data: Parameters<typeof create>[0] & { obligationId?: string }) => {
    try {
      const { obligationId, ...movementData } = data;
      const created = await create(movementData);
      if (obligationId && created?.id) {
        try {
          await linkObligation(obligationId, created.id);
        } catch {
          toast.warning("Movement created, but linking to obligation failed.");
          return;
        }
      }
      toast.success("Movement created");
    } catch {
      toast.error("Failed to create movement");
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success("Movement deleted");
  };

  return (
    <>
      <Header
        title="Movements"
        onAddClick={() => setFormOpen(true)}
        addLabel="New Movement"
      />
      <div className="p-4 md:p-6 space-y-4">
        <MovementFilters
          accounts={accounts}
          categories={categories}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : movements.length === 0 && !Object.values(filters).some(Boolean) ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No movements yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Record your first income or expense.
                </p>
              </div>
            ) : (
              <MovementTable
                movements={movements}
                categories={categories}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <MovementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        accounts={accounts}
        categories={categories}
        obligations={obligations}
      />
    </>
  );
}
