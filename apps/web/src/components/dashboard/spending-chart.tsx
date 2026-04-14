"use client";

import { useEffect, useState } from "react";
import { financeService } from "@finance/services";
import type { Currency } from "@finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";
import { useSettings } from "@/hooks/use-settings";
import { getYearMonthInTimeZone } from "@/lib/date";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

interface MonthData {
  month: string;
  income: number;
  expense: number;
}

interface SpendingChartProps {
  refreshKey?: number;
  defaultCurrency?: Currency;
}

const FALLBACK_COLORS = { muted: "#a1a1aa", card: "#27272a", border: "#3f3f46", cardFg: "#fafafa" };

/** Resolve multiple CSS variables to hex colors Recharts can render in SVG. */
function resolveColorsAsHex(vars: Record<string, string>): Record<string, string> {
  const s = getComputedStyle(document.documentElement);
  const el = document.createElement("div");
  document.body.appendChild(el);

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const result: Record<string, string> = {};

  for (const [key, fallback] of Object.entries(vars)) {
    const raw = s.getPropertyValue(key).trim();
    if (!raw) { result[key] = fallback; continue; }

    el.style.color = raw.startsWith("oklch(") || raw.startsWith("#") || raw.startsWith("rgb") || raw.startsWith("hsl")
      ? raw
      : `oklch(${raw})`;
    const computed = getComputedStyle(el).color;
    const match = computed.match(/(\d+),\s*(\d+),\s*(\d+)/);
    result[key] = match ? `#${toHex(+match[1])}${toHex(+match[2])}${toHex(+match[3])}` : fallback;
  }

  document.body.removeChild(el);
  return result;
}

function useChartColors() {
  const [colors, setColors] = useState(FALLBACK_COLORS);

  useEffect(() => {
    const resolved = resolveColorsAsHex({
      "--muted-foreground": FALLBACK_COLORS.muted,
      "--card": FALLBACK_COLORS.card,
      "--border": FALLBACK_COLORS.border,
      "--card-foreground": FALLBACK_COLORS.cardFg,
    });
    setColors({
      muted: resolved["--muted-foreground"],
      card: resolved["--card"],
      border: resolved["--border"],
      cardFg: resolved["--card-foreground"],
    });
  }, []);

  return colors;
}

export function SpendingChart({ refreshKey, defaultCurrency = "PEN" }: SpendingChartProps) {
  const { settings } = useSettings();
  const [data, setData] = useState<MonthData[]>([]);
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const colors = useChartColors();

  useEffect(() => {
    setCurrency(defaultCurrency);
  }, [defaultCurrency]);

  useEffect(() => {
    async function loadData() {
      const now = new Date();
      const current = getYearMonthInTimeZone(now, settings.timezone);
      const months: MonthData[] = [];

      for (let i = 2; i >= 0; i--) {
        const d = new Date(current.year, current.month - 1 - i, 1);
        const summary = await financeService.movements.getMonthlySummary(
          d.getFullYear(),
          d.getMonth() + 1,
          currency
        );
        months.push({
          month: monthFormatter.format(d),
          income: summary.income,
          expense: summary.expense,
        });
      }
      setData(months);
    }
    loadData();
  }, [currency, refreshKey, settings.timezone]);

  const symbol = getCurrencySymbol(currency);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Income vs Expenses
        </CardTitle>
        <div className="flex gap-1">
          {(["USD", "PEN"] as Currency[]).map((c) => (
            <Button
              key={c}
              variant={currency === c ? "default" : "outline"}
              size="xs"
              onClick={() => setCurrency(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <XAxis
              dataKey="month"
              stroke={colors.muted}
              fontSize={12}
              tick={{ fill: colors.muted }}
            />
            <YAxis
              stroke={colors.muted}
              fontSize={12}
              width={60}
              tick={{ fill: colors.muted }}
              tickFormatter={(v) => {
                if (v === 0) return `${symbol} 0`;
                if (v >= 1000) return `${symbol} ${(v / 1000).toFixed(0)}k`;
                return `${symbol} ${v}`;
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: colors.cardFg,
              }}
              labelStyle={{ color: colors.muted }}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              formatter={(value) => formatCurrency(Number(value), currency)}
            />
            <Legend wrapperStyle={{ color: colors.muted }} />
            <Bar
              dataKey="income"
              fill="#4ade80"
              radius={[4, 4, 0, 0]}
              name="Income"
            />
            <Bar
              dataKey="expense"
              fill="#f87171"
              radius={[4, 4, 0, 0]}
              name="Expenses"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
