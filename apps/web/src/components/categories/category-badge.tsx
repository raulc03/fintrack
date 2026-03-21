"use client";

import type { Category } from "@finance/types";
import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  category: Category;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={className}
      style={{ borderColor: category.color, color: category.color }}
    >
      {category.name}
    </Badge>
  );
}
