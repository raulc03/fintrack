"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService, financeService } from "@finance/services";
import type { UserSettings, UpdateSettingsInput } from "@finance/types";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { useAuth } from "@/lib/auth-context";

const DEFAULT_SETTINGS: UserSettings = {
  mainCurrency: "PEN",
  usdToPenRate: 3.7,
  timezone: DEFAULT_TIMEZONE,
};

interface UserSettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  update: (input: UpdateSettingsInput) => Promise<UserSettings>;
  refetch: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!authService.getSession()) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    try {
      const data = await financeService.settings.get();
      setSettings(data);
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void fetchSettings();
  }, [authLoading, user, fetchSettings]);

  const update = async (input: UpdateSettingsInput) => {
    const updated = await financeService.settings.update(input);
    setSettings(updated);
    return updated;
  };

  const value = useMemo<UserSettingsContextValue>(
    () => ({ settings, loading, update, refetch: fetchSettings }),
    [settings, loading]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettingsContext() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error("useUserSettingsContext must be used within UserSettingsProvider");
  }
  return context;
}
