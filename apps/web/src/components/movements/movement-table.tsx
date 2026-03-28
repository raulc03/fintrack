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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { MOVEMENT_TYPE_CONFIG } from "@/lib/constants";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface MovementTableProps {
  movements: Movement[];
  categories: Category[];
  onEdit?: (movement: Movement) => void;
  onDelete?: (id: string) => void;
}

export function MovementTable({
  movements,
  categories,
  onEdit,
  onDelete,
}: MovementTableProps) {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  if (movements.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No movements found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="hidden sm:table-cell">Category</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {(onEdit || onDelete) && <TableHead className="w-20" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((m) => {
          const config = MOVEMENT_TYPE_CONFIG[m.type];
          const Icon = config.icon;
          const category = categoryMap.get(m.categoryId);

          return (
            <TableRow key={m.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                <span className="hidden sm:inline">{format(new Date(m.date), "MMM dd, yyyy")}</span>
                <span className="sm:hidden">{format(new Date(m.date), "MM/dd")}</span>
              </TableCell>
              <TableCell>
                <span className={`flex items-center gap-1.5 ${config.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs">{config.label}</span>
                </span>
              </TableCell>
              <TableCell className="font-medium max-w-[120px] sm:max-w-none truncate">{m.description}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {category && (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: category.color,
                      color: category.color,
                    }}
                  >
                    {category.name}
                  </Badge>
                )}
              </TableCell>
              <TableCell
                className={`text-right font-medium whitespace-nowrap ${config.color}`}
              >
                {m.type === "expense" ? "-" : ""}
                {formatCurrency(m.amount, m.currency)}
              </TableCell>
              {(onEdit || onDelete) && (
                <TableCell>
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(m)}
                        aria-label={`Edit ${m.description}`}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(m.id)}
                        aria-label={`Delete ${m.description}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}
