import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart,
  Car,
  Home,
  Zap,
  Film,
  Heart,
  ShoppingBag,
  BookOpen,
  Briefcase,
  Laptop,
  TrendingUp,
  PlusCircle,
  Coffee,
  Gift,
  Music,
  Phone,
  Tag,
  ArrowLeftRight,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  zap: Zap,
  film: Film,
  heart: Heart,
  "shopping-bag": ShoppingBag,
  "book-open": BookOpen,
  briefcase: Briefcase,
  laptop: Laptop,
  "trending-up": TrendingUp,
  "plus-circle": PlusCircle,
  coffee: Coffee,
  gift: Gift,
  music: Music,
  phone: Phone,
  tag: Tag,
  "arrow-left-right": ArrowLeftRight,
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? Tag;
}
