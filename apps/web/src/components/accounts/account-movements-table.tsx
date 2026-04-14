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
import { formatDateInTimeZone } from "@/lib/date";
import { useSettings } from "@/hooks/use-settings";

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
  const { settings } = useSettings();
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
                <span className="hidden sm:inline">{formatDateInTimeZone(m.date, settings.timezone, { month: "short", day: "2-digit", year: "numeric" })}</span>
                <span className="sm:hidden">{formatDateInTimeZone(m.date, settings.timezone, { month: "2-digit", day: "2-digit" })}</span>
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
