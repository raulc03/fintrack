"use client";

import type { MovementType, Account, Category } from "@finance/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRef } from "react";
import { X, CalendarDays } from "lucide-react";
import { format } from "date-fns";

const TYPES: { value: MovementType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];

interface MovementFiltersProps {
  accounts: Account[];
  categories: Category[];
  filters: {
    type?: MovementType;
    accountId?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  onFiltersChange: (filters: MovementFiltersProps["filters"]) => void;
}

export function MovementFilters({
  accounts,
  categories,
  filters,
  onFiltersChange,
}: MovementFiltersProps) {
  const activeAccount = accounts.find((a) => a.id === filters.accountId);
  const activeCategory = categories.find((c) => c.id === filters.categoryId);

  const activeChips: { label: string; onRemove: () => void }[] = [];

  if (filters.type) {
    activeChips.push({
      label: TYPES.find((t) => t.value === filters.type)?.label ?? filters.type,
      onRemove: () => onFiltersChange({ ...filters, type: undefined }),
    });
  }
  if (activeAccount) {
    activeChips.push({
      label: activeAccount.name,
      onRemove: () => onFiltersChange({ ...filters, accountId: undefined }),
    });
  }
  if (activeCategory) {
    activeChips.push({
      label: activeCategory.name,
      onRemove: () => onFiltersChange({ ...filters, categoryId: undefined }),
    });
  }
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom
      ? format(new Date(filters.dateFrom), "MMM dd")
      : "...";
    const to = filters.dateTo
      ? format(new Date(filters.dateTo), "MMM dd")
      : "...";
    activeChips.push({
      label: `${from} – ${to}`,
      onRemove: () =>
        onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined }),
    });
  }

  return (
    <div className="space-y-2">
      {/* Filters — single row on desktop, wraps on mobile */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-muted p-0.5">
          {TYPES.map((t) => {
            const isActive =
              t.value === "all" ? !filters.type : filters.type === t.value;
            return (
              <button
                key={t.value}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    type: t.value === "all" ? undefined : t.value,
                  })
                }
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Account filter */}
        <Select
          value={filters.accountId ?? "__all__"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              accountId: v === "__all__" ? undefined : (v ?? undefined),
            })
          }
        >
          <SelectTrigger className="h-7 w-auto shrink-0 gap-1 rounded-full border-none bg-muted px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
            <span>Account</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select
          value={filters.categoryId ?? "__all__"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              categoryId: v === "__all__" ? undefined : (v ?? undefined),
            })
          }
        >
          <SelectTrigger className="h-7 w-auto shrink-0 gap-1 rounded-full border-none bg-muted px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
            <span>Category</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {categories.map((c) => (
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

        {/* Date from */}
        <DatePickerPill
          label="From"
          value={filters.dateFrom}
          onChange={(v) =>
            onFiltersChange({ ...filters, dateFrom: v || undefined })
          }
        />

        {/* Date to */}
        <DatePickerPill
          label="To"
          value={filters.dateTo}
          onChange={(v) =>
            onFiltersChange({ ...filters, dateTo: v || undefined })
          }
        />
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <Badge
              key={chip.label}
              variant="secondary"
              className="gap-1 pl-2.5 pr-1 py-0.5 text-xs cursor-pointer"
              onClick={chip.onRemove}
            >
              {chip.label}
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onFiltersChange({})}
            className="text-xs text-muted-foreground h-5 px-2"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

function DatePickerPill({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
      input.click();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 hover:bg-muted/80 transition-colors cursor-pointer"
    >
      <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">{label}</span>
      {value && (
        <span className="text-xs font-medium text-foreground">
          {format(new Date(value), "MMM dd, yyyy")}
        </span>
      )}
      <input
        ref={inputRef}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        className="absolute opacity-0 pointer-events-none"
      />
    </button>
  );
}
