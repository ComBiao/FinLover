"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Receipt,
  Repeat,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { displayName, useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

type TabItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const TAB_ITEMS: TabItem[] = [
  { label: "Home", href: "/homepage", icon: Home },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Recurring", href: "/recurring", icon: Repeat },
];

const MORE_ITEMS: TabItem[] = [
  { label: "Category", href: "/category", icon: LayoutGrid },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const ACCOUNT_HREF = "/profile";
const MORE_HREFS = [...MORE_ITEMS.map((item) => item.href), ACCOUNT_HREF];

const TAB_CLASS =
  "flex min-h-13 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors";

/**
 * Phone navigation: a fixed bar with the four most-used destinations plus a
 * "More" tab that opens a sheet for the rest. Replaces the Sidebar below `md`
 * (the Sidebar takes over from `md` up), so the two never show together.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const userName = displayName(currentUser);

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  const moreActive = MORE_HREFS.some(isActive);

  function renderIconBubble(Icon: LucideIcon, active: boolean) {
    return (
      <span
        className={cn(
          "flex h-7 w-13 items-center justify-center rounded-full transition-colors",
          active && "bg-primary/15"
        )}
      >
        <Icon className="size-5.5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <>
      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {TAB_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                TAB_CLASS,
                active ? "font-bold text-success" : "font-semibold text-foreground/65"
              )}
            >
              {renderIconBubble(item.icon, active)}
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
          className={cn(
            TAB_CLASS,
            moreActive ? "font-bold text-success" : "font-semibold text-foreground/65"
          )}
        >
          {renderIconBubble(MoreHorizontal, moreActive)}
          More
        </button>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="gap-2 md:hidden" showCloseButton={false}>
          <DialogTitle className="sr-only">More</DialogTitle>
          <div aria-hidden="true" className="mx-auto mb-1 h-1 w-10 rounded-full bg-border" />

          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className="flex min-h-14 items-center gap-3.5 rounded-xl px-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-muted text-foreground/70">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="size-4.5 text-muted-foreground" aria-hidden="true" />
              </Link>
            );
          })}

          <Link
            href={ACCOUNT_HREF}
            onClick={() => setMoreOpen(false)}
            aria-current={isActive(ACCOUNT_HREF) ? "page" : undefined}
            className="flex min-h-14 items-center gap-3.5 rounded-xl px-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-gradient-avatar font-bold text-white">
                {userName.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col">
              <span>Account</span>
              <span className="truncate text-xs font-medium text-muted-foreground">{userName}</span>
            </span>
            <ChevronRight className="size-4.5 text-muted-foreground" aria-hidden="true" />
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}
