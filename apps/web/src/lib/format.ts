/**
 * Returns ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
export function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
