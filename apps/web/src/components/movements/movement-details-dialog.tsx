"use client";

import type { Account, Category, Movement } from "@finance/types";
import { format } from "date-fns";
import { ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { MOVEMENT_TYPE_CONFIG } from "@/lib/constants";

interface MovementDetailsDialogProps {
  movement: Movement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
}

export function MovementDetailsDialog({
  movement,
  open,
  onOpenChange,
  accounts,
  categories,
  onEdit,
  onDelete,
}: MovementDetailsDialogProps) {
  if (!movement) return null;

  const config = MOVEMENT_TYPE_CONFIG[movement.type];
  const Icon = config.icon;
  const category = categories.find((item) => item.id === movement.categoryId);
  const sourceAccount = accounts.find((item) => item.id === movement.accountId);
  const destinationAccount = movement.destinationAccountId
    ? accounts.find((item) => item.id === movement.destinationAccountId)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="border-b border-border/60 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="space-y-2">
              <DialogTitle>{movement.description}</DialogTitle>
              <DialogDescription>
                Review the movement before editing or deleting it.
              </DialogDescription>
            </div>
            <Badge variant="outline" className={`gap-1.5 rounded-full px-3 py-1 ${config.color}`}>
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Amount</p>
                <p className={`mt-2 text-2xl font-semibold ${config.color}`}>
                  {movement.type === "expense" ? "-" : ""}
                  {formatCurrency(movement.amount, movement.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Date</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {format(new Date(movement.date), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Category">
              {category ? (
                <span
                  className="inline-flex h-8 w-44 items-center gap-3 rounded-full border px-3"
                  style={{
                    borderColor: category.color,
                    color: category.color,
                    backgroundColor: `${category.color}12`,
                  }}
                >
                  <span className="h-4 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="truncate text-xs font-medium">{category.name}</span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">No category</span>
              )}
            </DetailItem>
            <DetailItem label="Account">
              <span className="text-sm font-medium text-foreground">
                {sourceAccount ? `${sourceAccount.name} (${sourceAccount.currency})` : "Unknown account"}
              </span>
            </DetailItem>
            {movement.type === "transfer" && destinationAccount && (
              <DetailItem label="Destination">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  {destinationAccount.name} ({destinationAccount.currency})
                </span>
              </DetailItem>
            )}
            {movement.exchangeRate && (
              <DetailItem label="Exchange Rate">
                <span className="text-sm font-medium text-foreground">{movement.exchangeRate}</span>
              </DetailItem>
            )}
          </div>
        </div>

        <DialogFooter className="-mx-0 -mb-0 rounded-b-xl border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => onDelete(movement)}
            className="sm:mr-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => onEdit(movement)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
