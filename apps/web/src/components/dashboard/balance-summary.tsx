"use client";

import type { Account, Currency, UserSettings } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, convertCurrency, getCurrencySymbol } from "@/lib/currency";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BalanceSummaryProps {
  accounts: Account[];
  settings?: UserSettings;
}

function TrendIcon({ change }: { change: number }) {
  if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" aria-hidden="true" />;
  if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" aria-hidden="true" />;
  return <Minus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

function changeColor(change: number) {
  if (change > 0) return "text-green-500";
  if (change < 0) return "text-red-500";
  return "text-muted-foreground";
}

export function BalanceSummary({ accounts, settings }: BalanceSummaryProps) {
  const rate = settings?.usdToPenRate ?? 3.70;
  const mainCurrency: Currency = settings?.mainCurrency ?? "PEN";

  const data = SUPPORTED_CURRENCIES.map((currency) => {
    const filtered = accounts.filter((a) => a.currency === currency);
    const total = filtered.reduce((sum, a) => sum + a.currentBalance, 0);
    const initial = filtered.reduce((sum, a) => sum + a.initialBalance, 0);
    const change = total - initial;
    const changePercent = initial > 0 ? (change / initial) * 100 : 0;
    return { currency, total, change, changePercent, count: filtered.length };
  });

  // Total in main currency
  const totalMain = accounts.reduce(
    (sum, a) => sum + convertCurrency(a.currentBalance, a.currency, mainCurrency, rate), 0
  );
  const initialMain = accounts.reduce(
    (sum, a) => sum + convertCurrency(a.initialBalance, a.currency, mainCurrency, rate), 0
  );
  const totalChange = totalMain - initialMain;
  const totalChangePercent = initialMain > 0 ? (totalChange / initialMain) * 100 : 0;

  const rateLabel = `1 USD = ${getCurrencySymbol("PEN")} ${rate}`;

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 stagger-children">
      {data.map(({ currency, total, change, changePercent, count }) => (
        <Card key={currency}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total {currency}
            </CardTitle>
            <TrendIcon change={change} />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold truncate tabular-nums">
              {formatCurrency(total, currency)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium tabular-nums ${changeColor(change)}`}>
                {change > 0 ? "+" : ""}{changePercent.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {count} account{count !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Total balance across currencies */}
      <Card className="col-span-2 sm:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Balance
          </CardTitle>
          <TrendIcon change={totalChange} />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold truncate tabular-nums">
            {formatCurrency(totalMain, mainCurrency)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium tabular-nums ${changeColor(totalChange)}`}>
              {totalChange > 0 ? "+" : ""}{totalChangePercent.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">
              {accounts.length} account{accounts.length !== 1 ? "s" : ""} · {rateLabel}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
