export const DEFAULT_TIMEZONE = "America/Lima";

export const FALLBACK_TIMEZONES = [
  "America/Lima",
  "America/Bogota",
  "America/Santiago",
  "America/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

export function getSupportedTimezones() {
  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    return (Intl as typeof Intl & { supportedValuesOf: (key: "timeZone") => string[] }).supportedValuesOf("timeZone");
  }

  return FALLBACK_TIMEZONES;
}

export function getBrowserTimezone() {
  if (typeof Intl === "undefined") return DEFAULT_TIMEZONE;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
}

export function formatTimezoneLabel(timezone: string) {
  if (timezone === "UTC") return "UTC";

  const [region, ...rest] = timezone.split("/");
  const city = rest.join("/").replaceAll("_", " ");
  if (!city) return timezone;

  return `${city} (${region})`;
}
