"use client";

import { useEffect, useState } from "react";
import type { CategoryBucket, CategoryType } from "@finance/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryIcon } from "@/lib/category-icons";
import { CATEGORY_COLORS } from "@/lib/constants";
import { BUDGET_BUCKETS, getBudgetBucketMeta } from "@/lib/budgeting";
import { cn } from "@/lib/utils";

const ICONS = [
  "shopping-cart",
  "car",
  "home",
  "zap",
  "film",
  "heart",
  "shopping-bag",
  "book-open",
  "briefcase",
  "laptop",
  "trending-up",
  "plus-circle",
  "coffee",
  "gift",
  "music",
  "phone",
];

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    type: CategoryType;
    bucket?: CategoryBucket;
    icon: string;
    color: string;
  }) => void;
  defaultType?: CategoryType;
}

export function CategoryForm({
  open,
  onOpenChange,
  onSubmit,
  defaultType = "expense",
}: CategoryFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>(defaultType);
  const [bucket, setBucket] = useState<CategoryBucket>("necessity");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    setBucket("necessity");
  }, [defaultType, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type,
      bucket: type === "expense" ? bucket : undefined,
      icon,
      color,
    });
    setName("");
    setType(defaultType);
    setBucket("necessity");
    setIcon(ICONS[0]);
    setColor(CATEGORY_COLORS[0]);
    onOpenChange(false);
  };

  const SelectedIcon = getCategoryIcon(icon);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview */}
          <div className="flex justify-center py-2">
            <div className="flex flex-col items-center gap-2">
              <div
                className="size-16 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: color }}
              >
                <SelectedIcon className="size-7 text-white" />
              </div>
              <span className="text-sm font-medium">
                {name.trim() || "Category Name"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="category-name" className="text-sm font-medium">Name</label>
            <Input
              id="category-name"
              placeholder="e.g. Subscriptions"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category-type" className="text-sm font-medium">Type</label>
            <Select
              value={type}
              onValueChange={(v) => {
                if (!v) return;
                setType(v as CategoryType);
              }}
            >
              <SelectTrigger id="category-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "expense" && (
            <div className="space-y-2">
              <label htmlFor="category-bucket" className="text-sm font-medium">50/30/20 Bucket</label>
              <Select
                value={bucket}
                onValueChange={(value) => value && setBucket(value as CategoryBucket)}
              >
                <SelectTrigger id="category-bucket">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_BUCKETS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getBudgetBucketMeta(bucket).description}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => {
                const Icon = getCategoryIcon(i);
                return (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                      icon === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    onClick={() => setIcon(i)}
                    aria-label={i}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="size-7 rounded-full transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? "2px solid white" : "none",
                    outlineOffset: "2px",
                  }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Category</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
