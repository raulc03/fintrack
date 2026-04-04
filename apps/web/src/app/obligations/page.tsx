"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useObligations } from "@/hooks/use-obligations";
import { ObligationHistoryCard } from "@/components/obligations/obligation-history-card";
import { useCategories } from "@/hooks/use-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Trash2, Check, X, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { ordinalSuffix } from "@/lib/format";
import { getCoverageColorClass, getCoverageProgressClass, SUPPORTED_CURRENCIES } from "@/lib/constants";
import type { Currency, CreateObligationInput, Movement } from "@finance/types";

export default function ObligationsPage() {
  const {
    obligations,
    summaries,
    history,
    availableMovements,
    loading,
    loadingMoreHistory,
    error,
    refetch,
    create,
    remove,
    link,
    canLoadMoreHistory,
    loadMoreHistory,
  } = useObligations();
  const { categories } = useCategories("expense");
  const [creating, setCreating] = useState(false);
  const [linkingObligationId, setLinkingObligationId] = useState<string | null>(null);

  const handleCreate = async (data: CreateObligationInput) => {
    try {
      await create(data);
      setCreating(false);
      toast.success("Obligation created");
    } catch {
      toast.error("Failed to create obligation");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await remove(id);
      toast.success("Obligation deleted");
    } catch {
      toast.error("Failed to delete obligation");
    }
  };

  const handleLinkMovement = async (movementId: string) => {
    if (!linkingObligationId) return;
    try {
      await link(linkingObligationId, movementId);
      setLinkingObligationId(null);
      toast.success("Obligation linked to movement");
    } catch {
      toast.error("Failed to link movement");
    }
  };

  const handleUnlink = async (id: string) => {
    try {
      await link(id, null);
      toast.success("Obligation unlinked");
    } catch {
      toast.error("Failed to unlink");
    }
  };

  return (
    <>
      <Header
        title="Monthly Obligations"
        onAddClick={() => setCreating(true)}
        addLabel="Add Obligation"
      />
      <div className="p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[200px]" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8 text-center gap-3">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm text-muted-foreground">Failed to load obligations.</p>
              <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {summaries.map((s) => (
              <Card key={s.currency}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.currency} Coverage</span>
                    <span className={`text-lg font-bold ${getCoverageColorClass(s.coveragePercent)}`}>
                      {s.coveragePercent.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={s.coveragePercent}
                    className={getCoverageProgressClass(s.coveragePercent)}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium">{formatCurrency(s.totalObligations, s.currency as Currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-medium text-green-500">{formatCurrency(s.paidAmount, s.currency as Currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending</p>
                      <p className="font-medium text-yellow-500">{formatCurrency(s.pendingAmount, s.currency as Currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Free after</p>
                      <p className={`font-medium ${s.freeAfterObligations >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(s.freeAfterObligations, s.currency as Currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Obligations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {creating && (
                    <li>
                      <ObligationCreateRow
                        categories={categories}
                        onSave={handleCreate}
                        onCancel={() => setCreating(false)}
                      />
                    </li>
                  )}
                  {obligations.length === 0 && !creating && (
                    <li className="flex flex-col items-center py-8 text-center">
                      <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No obligations yet. Add your monthly bills to track coverage.</p>
                    </li>
                  )}
                  {obligations.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center gap-2 py-3 border-b border-border last:border-0"
                    >
                      {/* Left: toggle + name */}
                      <button
                        onClick={() => o.isPaid ? handleUnlink(o.id) : setLinkingObligationId(o.id)}
                        className="cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
                        aria-label={o.isPaid ? `Unlink ${o.name}` : `Link ${o.name} to a movement`}
                      >
                        {o.isPaid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${o.isPaid ? "text-muted-foreground line-through" : ""}`}>
                          {o.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due {o.dueDay}{ordinalSuffix(o.dueDay)} · {o.currency}
                        </p>
                      </div>
                      {/* Right: amount + badge + delete */}
                      <div className="flex items-center gap-2 ml-auto">
                        <div className="text-right">
                          {o.isPaid && o.linkedMovementAmount != null ? (
                            <>
                              <span className="text-sm font-medium">
                                {formatCurrency(o.linkedMovementAmount, o.currency as Currency)}
                              </span>
                              {Math.abs(o.linkedMovementAmount - o.estimatedAmount) > 0.01 && (
                                <p className={`text-[10px] ${o.linkedMovementAmount > o.estimatedAmount ? "text-red-400" : "text-green-400"}`}>
                                  exp. {formatCurrency(o.estimatedAmount, o.currency as Currency)}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-sm font-medium">
                              {formatCurrency(o.estimatedAmount, o.currency as Currency)}
                            </span>
                          )}
                        </div>
                        <Badge variant={o.isPaid ? "default" : "outline"} className="text-xs hidden sm:inline-flex">
                          {o.isPaid ? "Paid" : "Pending"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(o.id, o.name)}
                          aria-label={`Delete ${o.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <ObligationHistoryCard
              history={history}
              canLoadMore={canLoadMoreHistory}
              loadingMore={loadingMoreHistory}
              onLoadMore={loadMoreHistory}
            />
          </>
        )}
      </div>

      {/* Movement picker dialog */}
      <MovementPickerDialog
        open={linkingObligationId !== null}
        onOpenChange={(open) => !open && setLinkingObligationId(null)}
        movements={availableMovements.filter((m) => {
          const ob = obligations.find((o) => o.id === linkingObligationId);
          return !ob || m.currency === ob.currency;
        })}
        onSelect={handleLinkMovement}
      />
    </>
  );
}

function MovementPickerDialog({
  open,
  onOpenChange,
  movements,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movements: Movement[];
  onSelect: (movementId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a movement</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No unlinked expense movements this month.
            </p>
          ) : (
            <ul className="space-y-1">
              {movements.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => onSelect(m.id)}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(m.amount, m.currency as Currency)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ObligationCreateRow({
  categories,
  onSave,
  onCancel,
}: {
  categories: ReturnType<typeof useCategories>["categories"];
  onSave: (data: CreateObligationInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [dueDay, setDueDay] = useState("");

  const parsedAmount = parseFloat(amount);
  const parsedDay = parseInt(dueDay, 10);
  const canSave =
    name.trim() &&
    categoryId &&
    !isNaN(parsedAmount) && parsedAmount > 0 &&
    !isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      categoryId,
      estimatedAmount: parsedAmount,
      currency,
      dueDay: parsedDay,
    });
  };

  return (
    <Card className="border-dashed border-2 mb-2">
      <CardContent className="py-3 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Obligation name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && canSave) handleSave(); if (e.key === "Escape") onCancel(); }}
          />
          <Select value={currency} onValueChange={(v) => v && setCurrency(v as Currency)}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={categoryId || "__none__"} onValueChange={(v) => v && v !== "__none__" && setCategoryId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Category">
              {categories.find((c) => c.id === categoryId)?.name ?? "Category"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" disabled>Select category</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <AmountInput
            placeholder="Amount"
            value={amount}
            onChange={setAmount}
            className="w-[100px]"
          />
          <Input
            type="number"
            min="1"
            max="31"
            placeholder="Day"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            className="w-[70px]"
          />
        </div>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={!canSave}>
            <Check className="h-4 w-4 mr-1 text-green-500" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
