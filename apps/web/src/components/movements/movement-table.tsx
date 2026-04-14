"use client";

import type { Movement, Category } from "@finance/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import { MOVEMENT_TYPE_CONFIG } from "@/lib/constants";
import { formatDateInTimeZone } from "@/lib/date";
import { useSettings } from "@/hooks/use-settings";

interface MovementTableProps {
  movements: Movement[];
  categories: Category[];
  onSelect?: (movement: Movement) => void;
}

export function MovementTable({
  movements,
  categories,
  onSelect,
}: MovementTableProps) {
  const { settings } = useSettings();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  if (movements.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No movements found.
      </p>
    );
  }

  return (
    <Table className="rounded-2xl border border-border/60 bg-card/40">
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Date</TableHead>
          <TableHead className="w-14 text-center">Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="hidden sm:table-cell">Category</TableHead>
          <TableHead className="px-4 text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((m) => {
          const config = MOVEMENT_TYPE_CONFIG[m.type];
          const Icon = config.icon;
          const category = categoryMap.get(m.categoryId);

          return (
            <TableRow
              key={m.id}
              className={onSelect ? "cursor-pointer" : undefined}
              onClick={onSelect ? () => onSelect(m) : undefined}
              onKeyDown={onSelect ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(m);
                }
              } : undefined}
              tabIndex={onSelect ? 0 : undefined}
            >
              <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
                <span className="hidden sm:inline">{formatDateInTimeZone(m.date, settings.timezone, { month: "short", day: "2-digit", year: "numeric" })}</span>
                <span className="sm:hidden">{formatDateInTimeZone(m.date, settings.timezone, { month: "2-digit", day: "2-digit" })}</span>
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 ${config.color}`}
                  title={config.label}
                  aria-label={config.label}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </TableCell>
              <TableCell className="max-w-[120px] py-3 sm:max-w-none">
                <div className="truncate font-medium text-foreground">{m.description}</div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {category && (
                  <div
                    className="inline-flex h-8 w-40 items-center gap-3 rounded-full border px-3"
                    style={{
                      borderColor: category.color,
                      color: category.color,
                      backgroundColor: `${category.color}12`,
                    }}
                  >
                    <span
                      className="h-4 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-xs font-medium">{category.name}</span>
                  </div>
                )}
              </TableCell>
              <TableCell
                className={`px-4 text-right font-medium whitespace-nowrap ${config.color}`}
              >
                {m.type === "expense" ? "-" : ""}
                {formatCurrency(m.amount, m.currency)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
