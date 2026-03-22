"use client";

import { useState } from "react";
import type { Currency, CreateAccountInput } from "@finance/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Check, X } from "lucide-react";
import { ACCOUNT_COLORS } from "@/lib/constants";

interface AccountCardCreateProps {
  onSave: (data: CreateAccountInput) => void;
  onCancel: () => void;
}

export function AccountCardCreate({ onSave, onCancel }: AccountCardCreateProps) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [initialBalance, setInitialBalance] = useState("");
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);

  const canSave = name.trim() !== "" && initialBalance !== "";

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      currency,
      initialBalance: parseFloat(initialBalance),
      color,
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
          placeholder="Account name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm font-medium h-7 border-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
          autoFocus
        />
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
      </CardHeader>
      <CardContent className="space-y-3">
        <AmountInput
          placeholder="0.00"
          value={initialBalance}
          onChange={setInitialBalance}
          onKeyDown={handleKeyDown}
          className="text-2xl font-bold h-10 border-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/30"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {ACCOUNT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="w-5 h-5 rounded-full transition-transform hover:scale-110 cursor-pointer"
                style={{
                  backgroundColor: c,
                  outline: color === c ? "2px solid white" : "none",
                  outlineOffset: "2px",
                }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onCancel}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSave}
              disabled={!canSave}
            >
              <Check className="h-4 w-4 text-green-500" />
            </Button>
          </div>
        </div>
      </CardContent>
      <div
        className="h-1 rounded-b-lg transition-colors"
        style={{ backgroundColor: color }}
      />
    </Card>
  );
}
