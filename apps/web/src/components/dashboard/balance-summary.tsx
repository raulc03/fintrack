"use client";

import type { Account, Currency } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BalanceSummaryProps {
  accounts: Account[];
}

export function BalanceSummary({ accounts }: BalanceSummaryProps) {
  const currencies: Currency[] = ["USD", "PEN"];

  const data = currencies.map((currency) => {
    const filtered = accounts.filter((a) => a.currency === currency);
    const total = filtered.reduce((sum, a) => sum + a.currentBalance, 0);
    const initial = filtered.reduce((sum, a) => sum + a.initialBalance, 0);
    const change = total - initial;
    const changePercent = initial > 0 ? (change / initial) * 100 : 0;
    return { currency, total, change, changePercent, count: filtered.length };
  });

  return (
    <div className="grid gap-4 grid-cols-2 stagger-children">
      {data.map(({ currency, total, change, changePercent, count }) => {
        const isPositive = change > 0;
        const isNegative = change < 0;

        return (
          <Card key={currency}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total {currency}
              </CardTitle>
              {isPositive && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              {isNegative && (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              {!isPositive && !isNegative && (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold truncate">
                {formatCurrency(total, currency)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs font-medium ${
                    isPositive
                      ? "text-green-500"
                      : isNegative
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {changePercent.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {count} account{count !== 1 ? "s" : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
