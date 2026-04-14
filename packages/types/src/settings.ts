import type { Currency } from "./account";

export interface UserSettings {
  mainCurrency: Currency;
  usdToPenRate: number;
  timezone: string;
}

export interface UpdateSettingsInput {
  mainCurrency?: Currency;
  usdToPenRate?: number;
  timezone?: string;
}
