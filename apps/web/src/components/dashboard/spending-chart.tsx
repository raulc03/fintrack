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

interface MonthData {
  month: string;
  income: number;
  expense: number;
}

interface SpendingChartProps {
  refreshKey?: number;
}

export function SpendingChart({ refreshKey }: SpendingChartProps) {
  const [data, setData] = useState<MonthData[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");

  useEffect(() => {
    async function loadData() {
      const now = new Date();
      const months: MonthData[] = [];

      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const summary = await financeService.movements.getMonthlySummary(
          d.getFullYear(),
          d.getMonth() + 1,
          currency
        );
        months.push({
          month: d.toLocaleString("default", { month: "short" }),
          income: summary.income,
          expense: summary.expense,
        });
      }
      setData(months);
    }
    loadData();
  }, [currency, refreshKey]);

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
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <XAxis
              dataKey="month"
              stroke="#a1a1aa"
              fontSize={12}
              tick={{ fill: "#a1a1aa" }}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={12}
              width={60}
              tick={{ fill: "#a1a1aa" }}
              tickFormatter={(v) => {
                if (v === 0) return `${symbol} 0`;
                if (v >= 1000) return `${symbol} ${(v / 1000).toFixed(0)}k`;
                return `${symbol} ${v}`;
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                color: "#fafafa",
              }}
              labelStyle={{ color: "#a1a1aa" }}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              formatter={(value) => formatCurrency(Number(value), currency)}
            />
            <Legend wrapperStyle={{ color: "#a1a1aa" }} />
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
