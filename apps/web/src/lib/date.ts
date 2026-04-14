export function formatDateInTimeZone(
  value: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US"
) {
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(new Date(value));
}

function getLocalDateAnchor(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatLocalDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US"
) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }).format(
    getLocalDateAnchor(value)
  );
}

function getDateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
}

export function getTodayInTimeZone(timeZone: string) {
  const parts = getDateParts(new Date(), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getYearMonthInTimeZone(value: Date, timeZone: string) {
  const parts = getDateParts(value, timeZone);
  return { year: Number(parts.year), month: Number(parts.month) };
}

export function getDateInputValueInTimeZone(value: string | Date, timeZone: string) {
  return formatDateInTimeZone(
    value,
    timeZone,
    { year: "numeric", month: "2-digit", day: "2-digit" },
    "en-CA"
  );
}

export function toLocalDateTimeString(value: string, time = "12:00:00") {
  return `${value}T${time}`;
}
