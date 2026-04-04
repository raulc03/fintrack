"use client";

import { useState, useEffect, useMemo } from "react";
import type { MovementType, Account, Category, Obligation, Movement } from "@finance/types";
import { useSettings } from "@/hooks/use-settings";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { filterCategoriesByType, resolveMovementCategoryId } from "@/lib/constants";
import { formatCurrency } from "@/lib/currency";

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    type: MovementType;
    amount: number;
    description: string;
    date: string;
    accountId: string;
    destinationAccountId?: string;
    categoryId: string;
    obligationId?: string;
    exchangeRate?: number;
  }) => void;
  accounts: Account[];
  categories: Category[];
  obligations?: Obligation[];
  editingMovement?: Movement | null;
}

export function MovementForm({
  open,
  onOpenChange,
  onSubmit,
  accounts,
  categories,
  obligations = [],
  editingMovement,
}: MovementFormProps) {
  const isEditing = !!editingMovement;
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [obligationId, setObligationId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");

  // Pre-fill when opening in edit mode, reset when opening in create mode
  useEffect(() => {
    if (!open) return; // Don't touch state while closing (prevents flash)
    if (editingMovement) {
      setType(editingMovement.type);
      setAmount(String(editingMovement.amount));
      setDescription(editingMovement.description);
      setDate(editingMovement.date.split("T")[0]);
      setAccountId(editingMovement.accountId);
      setDestinationAccountId(editingMovement.destinationAccountId ?? "");
      setCategoryId(editingMovement.categoryId);
      setExchangeRate(editingMovement.exchangeRate ? String(editingMovement.exchangeRate) : "");
      setObligationId("");
    } else {
      setType("expense");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setAccountId(accounts[0]?.id ?? "");
      setDestinationAccountId("");
      setCategoryId("");
      setExchangeRate("");
      setObligationId("");
    }
  }, [open, editingMovement]); // eslint-disable-line react-hooks/exhaustive-deps
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { settings } = useSettings();

  const filteredCategories = filterCategoriesByType(categories, type);
  const resolvedCategoryId = resolveMovementCategoryId(categories, type, categoryId);
  const unpaidObligations = obligations.filter((o) => !o.isPaid);

  const sourceAccount = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId]);
  const destAccount = useMemo(() => accounts.find((a) => a.id === destinationAccountId), [accounts, destinationAccountId]);
  const isCrossCurrency = type === "transfer" && sourceAccount && destAccount && sourceAccount.currency !== destAccount.currency;

  // Pre-fill exchange rate when cross-currency detected
  useEffect(() => {
    if (isCrossCurrency && !exchangeRate) {
      const rate = settings.usdToPenRate;
      if (sourceAccount?.currency === "USD") {
        setExchangeRate(String(rate));
      } else {
        setExchangeRate(String(Math.round((1 / rate) * 10000) / 10000));
      }
    }
    if (!isCrossCurrency && !isEditing) setExchangeRate("");
  }, [isCrossCurrency, sourceAccount?.currency, settings.usdToPenRate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear validation errors as user corrects fields
  useEffect(() => {
    if (Object.keys(errors).length > 0) setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, description, accountId, destinationAccountId, categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = "Amount must be greater than 0";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!accountId) newErrors.account = "Account is required";
    if (type === "transfer" && !destinationAccountId) newErrors.destination = "Destination account is required";
    if (isCrossCurrency && (!exchangeRate || parseFloat(exchangeRate) <= 0)) newErrors.exchangeRate = "Exchange rate is required";
    if (type === "transfer" && !resolvedCategoryId) newErrors.category = "Transfer category is required";
    if (type !== "transfer" && !categoryId) newErrors.category = "Category is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit({
      type,
      amount: parseFloat(amount),
      description: description.trim(),
      date: `${date}T12:00:00`,
      accountId,
      destinationAccountId:
        type === "transfer" ? destinationAccountId : undefined,
      categoryId: resolvedCategoryId,
      obligationId: type === "expense" && obligationId ? obligationId : undefined,
      exchangeRate: isCrossCurrency ? parseFloat(exchangeRate) : undefined,
    });
    if (!isEditing) {
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setCategoryId("");
      setObligationId("");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0">
        <DialogHeader className="border-b border-border/60 px-6 pt-6 pb-4">
          <DialogTitle>{isEditing ? "Edit Movement" : "New Movement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
          {/* Type */}
          <Tabs
            value={type}
            onValueChange={(v) => {
              setType(v as MovementType);
              setCategoryId("");
              setObligationId("");
            }}
            className="gap-3"
          >
            <TabsList className={`w-full h-10 rounded-xl p-1 ${isEditing ? "pointer-events-none opacity-60" : ""}`}>
              <TabsTrigger value="expense" className="flex-1 rounded-lg">Expense</TabsTrigger>
              <TabsTrigger value="income" className="flex-1 rounded-lg">Income</TabsTrigger>
              <TabsTrigger value="transfer" className="flex-1 rounded-lg">Transfer</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount + Date */}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)]">
            <div className="space-y-2">
              <label htmlFor="movement-amount" className="text-sm font-medium">Amount</label>
              <AmountInput
                id="movement-amount"
                placeholder="0.00"
                value={amount}
                onChange={setAmount}
                required
                className="h-11 text-base"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="movement-date" className="text-sm font-medium">Date</label>
              <Input
                id="movement-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-11 w-full [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="movement-description" className="text-sm font-medium">Description</label>
            <Input
              id="movement-description"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="h-11"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          {/* Account + Category (expense/income) or From + To (transfer) */}
          {type === "transfer" ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-4">
                <p className="text-sm font-medium">Transfer details</p>
                <p className="text-xs text-muted-foreground">Move money between accounts and add an exchange rate when currencies differ.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="movement-account" className="text-sm font-medium">From</label>
                <Select
                  value={accountId}
                  onValueChange={(v) => { if (v) { setAccountId(v); if (v === destinationAccountId) setDestinationAccountId(""); } }}
                >
                  <SelectTrigger id="movement-account" className="h-11 w-full">
                    <SelectValue placeholder="Account">
                      {sourceAccount?.name ?? "Account"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account && <p className="text-xs text-destructive">{errors.account}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="movement-dest-account" className="text-sm font-medium">To</label>
                <Select
                  value={destinationAccountId}
                  onValueChange={(v) => v && setDestinationAccountId(v)}
                >
                  <SelectTrigger id="movement-dest-account" className="h-11 w-full">
                    <SelectValue placeholder="Account">
                      {destAccount?.name ?? "Account"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.id !== accountId).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.destination && <p className="text-xs text-destructive">{errors.destination}</p>}
              </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="movement-account" className="text-sm font-medium">Account</label>
                <Select
                  value={accountId}
                  onValueChange={(v) => v && setAccountId(v)}
                >
                  <SelectTrigger id="movement-account" className="h-11 w-full">
                    <SelectValue placeholder="Select">
                      {sourceAccount?.name ?? "Select"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account && <p className="text-xs text-destructive">{errors.account}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="movement-category" className="text-sm font-medium">Category</label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => v && setCategoryId(v)}
                >
                  <SelectTrigger id="movement-category" className="h-11 w-full">
                    <SelectValue placeholder="Select">
                      {filteredCategories.find((c) => c.id === categoryId)?.name ?? "Select"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
              </div>
            </div>
          )}

          {/* Exchange rate (cross-currency transfer) */}
          {isCrossCurrency && (
            <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div>
                <label className="text-sm font-medium">Exchange Rate</label>
                <p className="text-xs text-muted-foreground">Use the rate for this transfer so the destination amount is recorded correctly.</p>
              </div>
              <AmountInput
                value={exchangeRate}
                onChange={setExchangeRate}
                placeholder="e.g. 3.70"
                className="h-11"
              />
              {amount && exchangeRate && parseFloat(exchangeRate) > 0 && (
                <div className="rounded-lg bg-background/80 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/60">
                  {sourceAccount?.currency} {amount} x {exchangeRate} = {destAccount?.currency}{" "}
                  {(parseFloat(amount) * parseFloat(exchangeRate)).toFixed(2)}
                </div>
              )}
              {errors.exchangeRate && <p className="text-xs text-destructive">{errors.exchangeRate}</p>}
            </div>
          )}

          {/* Obligation link (expense only) */}
          {type === "expense" && unpaidObligations.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="movement-obligation" className="text-sm font-medium">Obligation (optional)</label>
              <Select
                value={obligationId || "__none__"}
                onValueChange={(v) => v && setObligationId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="movement-obligation" className="h-11 w-full">
                  <SelectValue placeholder="None">
                    {unpaidObligations.find((o) => o.id === obligationId)?.name ?? "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {unpaidObligations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name} ({formatCurrency(o.estimatedAmount, o.currency)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-5 border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-w-[152px]">{isEditing ? "Save Changes" : "Create Movement"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
