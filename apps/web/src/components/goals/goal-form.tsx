"use client";

import { useState } from "react";
import type { GoalType, Currency, Category } from "@finance/types";
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

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    type: GoalType;
    targetAmount: number;
    currency: Currency;
    categoryId?: string;
    deadline?: string;
  }) => void;
  expenseCategories: Category[];
}

export function GoalForm({
  open,
  onOpenChange,
  onSubmit,
  expenseCategories,
}: GoalFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<GoalType>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [categoryId, setCategoryId] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount) return;
    if (type === "expense_limit" && !categoryId) return;
    onSubmit({
      name: name.trim(),
      type,
      targetAmount: parseFloat(targetAmount),
      currency,
      categoryId: type === "expense_limit" ? categoryId : undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });
    setName("");
    setType("savings");
    setTargetAmount("");
    setCategoryId("");
    setDeadline("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <label className="text-sm font-medium">Goal Name</label>
            <Input
              placeholder="e.g. Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={type}
              onValueChange={(v) => v && setType(v as GoalType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="expense_limit">Expense Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">
              {type === "expense_limit"
                ? "Monthly Limit"
                : "Target Amount"}
            </label>
            <AmountInput
              placeholder="0.00"
              value={targetAmount}
              onChange={setTargetAmount}
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Currency</label>
            <Select
              value={currency}
              onValueChange={(v) => v && setCurrency(v as Currency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="PEN">PEN (S/)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "expense_limit" && (
            <div className="space-y-4">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={categoryId}
                onValueChange={(v) => v && setCategoryId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category">
                    {expenseCategories.find((c) => c.id === categoryId)?.name ?? "Select category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type !== "expense_limit" && (
            <div className="space-y-4">
              <label className="text-sm font-medium">
                Deadline (optional)
              </label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
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
