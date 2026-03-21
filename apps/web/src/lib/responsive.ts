/**
 * Shared responsive class patterns to avoid duplication.
 * Use these instead of repeating the same breakpoint classes across pages.
 */
export const grid = {
  /** 1 col → 2 col (sm) → 3 col (lg). Used for cards: accounts, goals. */
  cards: "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 stagger-children",
  /** 1 col → 3 col (sm). Used for stat cards on detail pages. */
  stats: "grid gap-4 grid-cols-1 sm:grid-cols-3 stagger-children",
  /** 1 col → 2 col (md). Used for dashboard split layout. */
  split: "grid gap-4 grid-cols-1 md:grid-cols-2",
};

/** Mobile-hidden table cell: only visible on sm+ screens */
export const hiddenOnMobile = "hidden sm:table-cell";
