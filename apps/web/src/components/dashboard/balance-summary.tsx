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
  if (change > 0) return <TrendingUp className="h-3.5 w-3.5 text-green-500 sm:h-4 sm:w-4" aria-hidden="true" />;
  if (change < 0) return <TrendingDown className="h-3.5 w-3.5 text-red-500 sm:h-4 sm:w-4" aria-hidden="true" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" aria-hidden="true" />;
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
    <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 sm:overflow-visible">
      <div className="flex snap-x gap-2 sm:grid sm:grid-cols-3 sm:gap-3 stagger-children">
        {data.map(({ currency, total, change, changePercent, count }) => (
          <SummaryCard
            key={currency}
            title={`${currency} Total`}
            value={formatCurrency(total, currency)}
            change={change}
            changeLabel={`${change > 0 ? "+" : ""}${changePercent.toFixed(1)}%`}
            meta={`${count} account${count !== 1 ? "s" : ""}`}
          />
        ))}

        <SummaryCard
          title="Total Balance"
          value={formatCurrency(totalMain, mainCurrency)}
          change={totalChange}
          changeLabel={`${totalChange > 0 ? "+" : ""}${totalChangePercent.toFixed(1)}%`}
          meta={`${accounts.length} account${accounts.length !== 1 ? "s" : ""} · ${rateLabel}`}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  change,
  changeLabel,
  meta,
}: {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  meta: string;
}) {
  return (
    <Card className="min-w-[168px] snap-start border-border/60 bg-card/70 sm:min-w-0">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 px-3 pt-3 pb-1.5 sm:px-4 sm:pt-4 sm:pb-2">
        <CardTitle className="pr-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-xs sm:tracking-[0.16em]">
          {title}
        </CardTitle>
        <TrendIcon change={change} />
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
        <div className="text-[1.35rem] font-semibold leading-none tabular-nums sm:text-xl">
          {value}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] sm:mt-1 sm:gap-2 sm:text-[11px]">
          <span className={`text-[10px] font-medium tabular-nums sm:text-xs ${changeColor(change)}`}>
            {changeLabel}
          </span>
          <span className="text-[10px] text-muted-foreground sm:text-xs">
            {meta}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
