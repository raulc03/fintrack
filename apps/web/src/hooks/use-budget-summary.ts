"use client";

import { useEffect, useState } from "react";
import type { BudgetSummary } from "@finance/types";
import { appApiRequest } from "@/lib/api";
import { getCurrentYearMonthInTimeZone } from "@/lib/budgeting";
import { useSettings } from "@/hooks/use-settings";

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
        const data = await appApiRequest<BudgetSummary>(
          `/api/budgeting/summary?year=${year}&month=${month}&currency=${settings.mainCurrency}`
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
