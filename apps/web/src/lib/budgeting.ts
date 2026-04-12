import type { CategoryBucket } from "@finance/types";

export const BUDGET_BUCKETS: {
  value: CategoryBucket;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: "necessity",
    label: "50 - Necessities",
    shortLabel: "Necessities",
    description: "Essential spending to live and work this month.",
  },
  {
    value: "desire",
    label: "30 - Desires",
    shortLabel: "Desires",
    description: "Optional spending. Ask: can I live without this one more month?",
  },
  {
    value: "save_invest",
    label: "20 - Save & Invest",
    shortLabel: "Save & Invest",
    description: "Future money. If debt is dragging, direct this bucket there first.",
  },
];

export function getBudgetBucketMeta(bucket: CategoryBucket) {
  return BUDGET_BUCKETS.find((item) => item.value === bucket) ?? BUDGET_BUCKETS[0];
}

export function getCurrentYearMonthInTimeZone(timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value ?? new Date().getFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value ?? new Date().getMonth() + 1);
  return { year, month };
}
