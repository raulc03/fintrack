"use client";

import Link from "next/link";
import type { Movement } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { MOVEMENT_TYPE_CONFIG } from "@/lib/constants";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });

interface RecentMovementsProps {
  movements: Movement[];
  onEdit?: (movement: Movement) => void;
}

export function RecentMovements({ movements, onEdit }: RecentMovementsProps) {
  const recent = movements.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium">
          Recent Movements
        </CardTitle>
        <Link
          href="/movements"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No movements yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((m) => {
              const config = MOVEMENT_TYPE_CONFIG[m.type];
              const Icon = config.icon;
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between ${onEdit ? "cursor-pointer hover:bg-accent/50 -mx-2 rounded-lg px-2 py-2 transition-colors" : ""}`}
                  onClick={() => onEdit?.(m)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-md bg-muted p-1.5 ${config.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(m.date))}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${config.color}`}
                  >
                    {m.type === "expense" ? "-" : ""}
                    {formatCurrency(m.amount, m.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
