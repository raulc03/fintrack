"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useObligations } from "@/hooks/use-obligations";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Trash2, Check, X, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { ordinalSuffix } from "@/lib/format";
import { getCoverageColorClass, getCoverageProgressClass, SUPPORTED_CURRENCIES } from "@/lib/constants";
import type { Currency, CreateObligationInput } from "@finance/types";

export default function ObligationsPage() {
  const { obligations, summaries, loading, error, refetch, create, remove, togglePaid } = useObligations();
  const { categories } = useCategories("expense");
  const [creating, setCreating] = useState(false);

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

  const handleTogglePaid = async (id: string, paid: boolean) => {
    try {
      await togglePaid(id, paid);
      toast.success(paid ? "Marked as paid" : "Marked as pending");
    } catch {
      toast.error("Failed to update obligation");
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
            {/* Summary cards per currency */}
            {summaries.map((s) => {
              return (
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
              );
            })}

            {/* Obligations list */}
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
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleTogglePaid(o.id, !o.manuallyPaid)}
                          className="cursor-pointer shrink-0"
                          aria-label={o.isPaid ? `Mark ${o.name} as pending` : `Mark ${o.name} as paid`}
                          disabled={!!o.linkedMovementId}
                        >
                          {o.isPaid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <div>
                          <p className={`text-sm font-medium ${o.isPaid ? "text-muted-foreground line-through" : ""}`}>
                            {o.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due {o.dueDay}{ordinalSuffix(o.dueDay)} · {o.currency}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatCurrency(o.estimatedAmount, o.currency as Currency)}
                        </span>
                        <Badge variant={o.isPaid ? "default" : "outline"} className="text-xs">
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
          </>
        )}
      </div>
    </>
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
        <div className="flex gap-2">
          <Select value={categoryId || "__none__"} onValueChange={(v) => v && v !== "__none__" && setCategoryId(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled>Select category</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
