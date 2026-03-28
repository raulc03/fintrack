"use client";

import { useState, useEffect, useCallback } from "react";
import { financeService } from "@finance/services";
import type { UserSettings, UpdateSettingsInput } from "@finance/types";

const DEFAULT_SETTINGS: UserSettings = {
  mainCurrency: "PEN",
  usdToPenRate: 3.70,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await financeService.settings.get();
      setSettings(data);
    } catch {
      // Use defaults if fetch fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const update = async (input: UpdateSettingsInput) => {
    const updated = await financeService.settings.update(input);
    setSettings(updated);
    return updated;
  };

  return { settings, loading, update, refetch: fetch };
}
