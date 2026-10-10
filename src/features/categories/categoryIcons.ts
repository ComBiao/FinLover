import {
  Award,
  Banknote,
  Briefcase,
  Car,
  CreditCard,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  MoreHorizontal,
  PieChart,
  ShoppingCart,
  Smile,
  Star,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { CategoryIcon } from "@/shared/contracts";

/** Every icon name the API accepts (`CATEGORY_ICON_NAMES`), mapped to its lucide component. */
export const CATEGORY_ICONS: Record<CategoryIcon, LucideIcon> = {
  Utensils,
  Car,
  Home,
  ShoppingCart,
  Zap,
  HeartPulse,
  Film,
  Wallet,
  Banknote,
  Gift,
  Award,
  PieChart,
  MoreHorizontal,
  Star,
  Smile,
  GraduationCap,
  Briefcase,
  CreditCard,
};

/** Categories created without an icon (the field is optional) fall back to the neutral "more" icon. */
export function resolveCategoryIcon(name: string | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name as CategoryIcon]) || MoreHorizontal;
}
