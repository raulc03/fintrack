"use client";

import { useRef, useState } from "react";
import type { GoalType, Currency, Category, CreateGoalInput } from "@finance/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Check, X, CalendarDays } from "lucide-react";

const typeLabels: Record<GoalType, string> = {
  savings: "Savings",
  investment: "Investment",
  expense_limit: "Expense Limit",
};

interface GoalCardCreateProps {
  type: GoalType;
  expenseCategories: Category[];
  onSave: (data: CreateGoalInput) => void;
  onCancel: () => void;
}

export function GoalCardCreate({
  type,
  expenseCategories,
  onSave,
  onCancel,
}: GoalCardCreateProps) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [targetAmount, setTargetAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [deadline, setDeadline] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);

  const canSave =
    name.trim() !== "" &&
    targetAmount !== "" &&
    (type !== "expense_limit" || categoryId !== "");

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      type,
      targetAmount: parseFloat(targetAmount),
      currency,
      categoryId: type === "expense_limit" ? categoryId : undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSave) handleSave();
    if (e.key === "Escape") onCancel();
  };

  return (
    <Card className="border-dashed border-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
        <Input
          placeholder="Goal name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm font-medium h-7 border-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
          autoFocus
        />
        <Badge variant="outline">{typeLabels[type]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Select
            value={currency}
            onValueChange={(v) => v && setCurrency(v as Currency)}
          >
            <SelectTrigger className="w-[75px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="PEN">PEN</SelectItem>
            </SelectContent>
          </Select>
          <AmountInput
            placeholder={type === "expense_limit" ? "Monthly limit" : "Target amount"}
            value={targetAmount}
            onChange={setTargetAmount}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
          />
        </div>

        {type === "expense_limit" && (
          <Select
            value={categoryId || "__none__"}
            onValueChange={(v) => v && v !== "__none__" && setCategoryId(v)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select category">
                {expenseCategories.find((c) => c.id === categoryId)?.name ?? "Select category"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled>Select category</SelectItem>
              {expenseCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {type !== "expense_limit" && (
          <button
            type="button"
            onClick={() => dateRef.current?.showPicker()}
            className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {deadline
              ? new Date(deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Set deadline (optional)"}
            <input
              ref={dateRef}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="sr-only"
              tabIndex={-1}
            />
          </button>
        )}

        <div className="flex justify-end gap-1 pt-1">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1 text-muted-foreground" />
            Cancel
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={!canSave}>
            <Check className="h-4 w-4 mr-1 text-green-500" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
