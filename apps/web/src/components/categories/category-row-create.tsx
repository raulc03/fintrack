"use client";

import { useState } from "react";
import type { CategoryType, CreateCategoryInput } from "@finance/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/constants";

interface CategoryRowCreateProps {
  type: CategoryType;
  onSave: (data: CreateCategoryInput) => void;
  onCancel: () => void;
}

export function CategoryRowCreate({
  type,
  onSave,
  onCancel,
}: CategoryRowCreateProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  const canSave = name.trim() !== "";

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), type, color });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSave) handleSave();
    if (e.key === "Escape") onCancel();
  };

  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="w-5 h-5 rounded-full transition-transform hover:scale-110 cursor-pointer"
                style={{
                  backgroundColor: c,
                  outline: color === c ? "2px solid white" : "none",
                  outlineOffset: "1px",
                }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <Input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-sm font-medium h-7 border-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
            autoFocus
          />
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
      </CardContent>
    </Card>
  );
}
