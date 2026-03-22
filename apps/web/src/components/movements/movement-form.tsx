"use client";

import { useState } from "react";
import type { MovementType, Account, Category, Obligation } from "@finance/types";
import {
  Dialog,
  DialogContent,
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
import { filterCategoriesByType } from "@/lib/constants";

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
  }) => void;
  accounts: Account[];
  categories: Category[];
  obligations?: Obligation[];
}

export function MovementForm({
  open,
  onOpenChange,
  onSubmit,
  accounts,
  categories,
  obligations = [],
}: MovementFormProps) {
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [obligationId, setObligationId] = useState("");

  const filteredCategories = filterCategoriesByType(categories, type);
  const unpaidObligations = obligations.filter((o) => !o.isPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description.trim() || !accountId || !categoryId) return;
    onSubmit({
      type,
      amount: parseFloat(amount),
      description: description.trim(),
      date: new Date(date).toISOString(),
      accountId,
      destinationAccountId:
        type === "transfer" ? destinationAccountId : undefined,
      categoryId,
      obligationId: type === "expense" && obligationId ? obligationId : undefined,
    });
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategoryId("");
    setObligationId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Movement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs
            value={type}
            onValueChange={(v) => {
              setType(v as MovementType);
              setCategoryId("");
              setObligationId("");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">
                Expense
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1">
                Income
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex-1">
                Transfer
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4">
            <label className="text-sm font-medium">Amount</label>
            <AmountInput
              placeholder="0.00"
              value={amount}
              onChange={setAmount}
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">
              {type === "transfer" ? "From Account" : "Account"}
            </label>
            <Select
              value={accountId}
              onValueChange={(v) => v && setAccountId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "transfer" && (
            <div className="space-y-4">
              <label className="text-sm font-medium">To Account</label>
              <Select
                value={destinationAccountId}
                onValueChange={(v) => v && setDestinationAccountId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type !== "transfer" && (
            <div className="space-y-4">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={categoryId}
                onValueChange={(v) => v && setCategoryId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "expense" && unpaidObligations.length > 0 && (
            <div className="space-y-4">
              <label className="text-sm font-medium">Link to Obligation (optional)</label>
              <Select
                value={obligationId || "__none__"}
                onValueChange={(v) => v && setObligationId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {unpaidObligations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
