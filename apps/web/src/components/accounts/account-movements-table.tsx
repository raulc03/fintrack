"use client";

import type { Movement } from "@finance/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { MOVEMENT_TYPE_CONFIG } from "@/lib/constants";
import { format } from "date-fns";

const badgeVariant: Record<string, "default" | "destructive" | "secondary"> = {
  income: "default",
  expense: "destructive",
  transfer: "secondary",
};

interface AccountMovementsTableProps {
  movements: Movement[];
}

export function AccountMovementsTable({
  movements,
}: AccountMovementsTableProps) {
  if (movements.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No movements for this account yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((m) => {
          const config = MOVEMENT_TYPE_CONFIG[m.type];
          const Icon = config.icon;
          const variant = badgeVariant[m.type];
          return (
            <TableRow key={m.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                <span className="hidden sm:inline">{format(new Date(m.date), "MMM dd, yyyy")}</span>
                <span className="sm:hidden">{format(new Date(m.date), "MM/dd")}</span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={variant} className="gap-1">
                  <Icon className="h-3 w-3" />
                  {m.type}
                </Badge>
              </TableCell>
              <TableCell>{m.description}</TableCell>
              <TableCell className={`text-right font-medium ${config.color}`}>
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
