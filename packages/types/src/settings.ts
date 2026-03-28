import type { Currency } from "./account";

export interface UserSettings {
  mainCurrency: Currency;
  usdToPenRate: number;
}

export interface UpdateSettingsInput {
  mainCurrency?: Currency;
  usdToPenRate?: number;
}
