"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Home,
  LayoutGrid,
  Receipt,
  Repeat,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/homepage", icon: Home },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "Recurring", href: "/recurring", icon: Repeat },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Category", href: "/category", icon: LayoutGrid },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const BOTTOM_ITEMS: NavItem[] = [{ label: "Account", href: "/profile", icon: User }];

/**
 * App navigation rail (`md` and up). Collapsed to icons by default, expands
 * to show labels on hover. Fixed positioning makes it overlay page content
 * instead of pushing it. Phones get the BottomNav instead.
 */
export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  function renderItem(item: NavItem) {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "mx-2 flex h-11 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="size-5 shrink-0" />
        <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 md:group-hover:opacity-100">
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <nav
      aria-label="Main"
      className="group fixed inset-y-0 left-0 z-50 hidden w-16 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-300 ease-in-out md:flex md:hover:w-64"
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary">
          <CreditCard className="size-4 text-primary-foreground" />
        </div>
        <span className="whitespace-nowrap text-lg font-bold text-foreground opacity-0 transition-opacity duration-200 md:group-hover:opacity-100">
          Finlover
        </span>
      </div>

      <div className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(renderItem)}
      </div>

      <div className="mb-3 flex flex-col gap-1 border-t border-border pt-3">
        {BOTTOM_ITEMS.map(renderItem)}
        <UserMenu />
      </div>
    </nav>
  );
}
