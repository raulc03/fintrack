"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { MovementTable } from "@/components/movements/movement-table";
import { MovementFilters } from "@/components/movements/movement-filters";
import { MovementForm } from "@/components/movements/movement-form";
import { MovementDetailsDialog } from "@/components/movements/movement-details-dialog";
import { useMovements } from "@/hooks/use-movements";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useObligations } from "@/hooks/use-obligations";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import type { Movement, MovementType, MovementFilters as Filters } from "@finance/types";
import { toLocalDateTimeString } from "@/lib/date";

export default function MovementsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
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
      dateFrom: filters.dateFrom ? toLocalDateTimeString(filters.dateFrom, "00:00:00") : undefined,
      dateTo: filters.dateTo ? toLocalDateTimeString(filters.dateTo, "23:59:59") : undefined,
    }),
    [filters]
  );

  const { movements, loading, create, update, remove } = useMovements(apiFilters);
  const { accounts, refetch: refetchAccounts } = useAccounts();
  const { categories } = useCategories();
  const { obligations, link: linkObligation } = useObligations();

  const handleCreate = async (data: Parameters<typeof create>[0] & { obligationId?: string }) => {
    try {
      const { obligationId, ...movementData } = data;
      const created = await create(movementData);
      refetchAccounts();
      if (obligationId && created?.id) {
        try {
          await linkObligation(obligationId, created.id);
        } catch {
          toast.warning("Movement created, but linking to obligation failed.");
        }
      }
      toast.success("Movement created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create movement");
    }
  };

  const handleEdit = async (data: Parameters<typeof create>[0] & { obligationId?: string }) => {
    if (!editingMovement) return;
    try {
      const { obligationId, exchangeRate, ...movementData } = data;
      await update(editingMovement.id, movementData);
      refetchAccounts();
      toast.success("Movement updated");
    } catch {
      toast.error("Failed to update movement");
    }
  };

  const handleDelete = async (movement: Movement) => {
    if (!confirm(`Delete \"${movement.description}\"?`)) return;
    try {
      await remove(movement.id);
      setSelectedMovement(null);
      refetchAccounts();
      toast.success("Movement deleted");
    } catch {
      toast.error("Failed to delete movement");
    }
  };

  const openEdit = (movement: Movement) => {
    setSelectedMovement(null);
    setEditingMovement(movement);
    setFormOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    if (!open) setSelectedMovement(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingMovement(null);
  };

  return (
    <>
      <Header
        title="Movements"
        onAddClick={() => { setEditingMovement(null); setFormOpen(true); }}
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
                onSelect={setSelectedMovement}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <MovementForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={editingMovement ? handleEdit : handleCreate}
        accounts={accounts}
        categories={categories}
        obligations={obligations}
        editingMovement={editingMovement}
      />

      <MovementDetailsDialog
        open={!!selectedMovement}
        onOpenChange={handleDetailsOpenChange}
        movement={selectedMovement}
        accounts={accounts}
        categories={categories}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </>
  );
}
