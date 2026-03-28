import type { Currency } from "@finance/types";

const formatters: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }),
  PEN: new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }),
};

export function formatCurrency(amount: number, currency: Currency): string {
  const formatted = formatters[currency].format(amount);
  // Ensure consistent "SYMBOL SPACE AMOUNT" format
  // en-US produces "$1,234" (no space), es-PE produces "S/ 1,234" (has space)
  return formatted.replace(/^(\$)(\d)/, "$1 $2");
}

export function getCurrencySymbol(currency: Currency): string {
  return currency === "USD" ? "$" : "S/";
}

export function convertCurrency(amount: number, from: Currency, to: Currency, usdToPenRate: number): number {
  if (from === to) return amount;
  if (usdToPenRate <= 0) return amount;
  if (from === "USD" && to === "PEN") return amount * usdToPenRate;
  if (from === "PEN" && to === "USD") return amount / usdToPenRate;
  return amount;
}
