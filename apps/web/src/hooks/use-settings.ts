"use client";

import { useUserSettingsContext } from "@/lib/user-settings-context";

export function useSettings() {
  return useUserSettingsContext();
}
