"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  LayoutGrid,
  Menu,
  Receipt,
  Settings,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Transactions", href: "/dashboard/transactions", icon: Receipt },
  { label: "Category", href: "/dashboard/categories", icon: LayoutGrid },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

/**
 * App navigation rail. Collapsed to icons by default, expands to show
 * labels on hover (desktop) or via the toggle button (mobile). Fixed
 * positioning makes it overlay page content instead of pushing it.
 */
export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        onClick={() => setMobileOpen(false)}
        className={cn(
          "mx-2 flex h-11 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="size-5 shrink-0" />
        <span
          className={cn(
            "whitespace-nowrap opacity-0 transition-opacity duration-200 md:group-hover:opacity-100",
            mobileOpen && "max-md:opacity-100"
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <>
      {/* Backdrop, mobile only, closes the sidebar on outside tap */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        className="fixed left-4 top-4 z-50 flex size-10 items-center justify-center rounded-lg border border-border bg-card shadow-md md:hidden"
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      <nav
        aria-label="Main"
        className={cn(
          "group fixed inset-y-0 left-0 z-50 flex w-16 flex-col overflow-hidden border-r border-border bg-card transition-[width,transform] duration-300 ease-in-out md:translate-x-0 md:hover:w-64",
          mobileOpen ? "max-md:w-64" : "max-md:-translate-x-full"
        )}
      >
        <Link
          href="/dashboard"
          className="flex h-16 shrink-0 items-center gap-2.5 px-4"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary">
            <CreditCard className="size-4 text-primary-foreground" />
          </div>
          <span
            className={cn(
              "whitespace-nowrap text-lg font-bold text-foreground opacity-0 transition-opacity duration-200 md:group-hover:opacity-100",
              mobileOpen && "max-md:opacity-100"
            )}
          >
            Finlover
          </span>
        </Link>

        <div className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(renderItem)}
        </div>

        <div className="mb-3 flex flex-col gap-1 border-t border-border pt-3">
          {BOTTOM_ITEMS.map(renderItem)}
        </div>
      </nav>
    </>
  );
}
