"use client";

import { useEffect, useState } from "react";
import type { BudgetSummary } from "@finance/types";
import { appApiRequest } from "@/lib/api";
import { getCurrentYearMonthInTimeZone } from "@/lib/budgeting";
import { useSettings } from "@/hooks/use-settings";

type MovementListResponse = {
  data: Array<{
    currency: "USD" | "PEN";
    amount: number;
  }>;
};

export function useBudgetSummary() {
  const { settings } = useSettings();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { year, month } = getCurrentYearMonthInTimeZone(settings.timezone);
        const incomeMovements = await appApiRequest<MovementListResponse>(
          `/api/movements?type=income&currentMonth=true&page=1&pageSize=100`
        );

        const incomeByCurrency = incomeMovements.data.reduce<Record<string, number>>((totals, movement) => {
          totals[movement.currency] = (totals[movement.currency] ?? 0) + movement.amount;
          return totals;
        }, {});

        const summaryCurrency = (Object.entries(incomeByCurrency)
          .sort((a, b) => b[1] - a[1])[0]?.[0] as "USD" | "PEN" | undefined)
          ?? settings.mainCurrency;

        const data = await appApiRequest<BudgetSummary>(
          `/api/budgeting/summary?year=${year}&month=${month}&currency=${summaryCurrency}`
        );
        if (cancelled) return;
        setSummary(data);
        setError(null);
      } catch (nextError) {
        if (cancelled) return;
        setError(nextError as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [settings.mainCurrency, settings.timezone]);

  return { summary, loading, error };
}
