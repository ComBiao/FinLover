"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { displayName, useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

type UserMenuProps = {
  /** Forces the name label visible even without hover — the sidebar's hover-to-expand only applies on desktop, so mobile needs this to show the label when the rail is toggled open. */
  mobileOpen?: boolean;
  /** Closes the mobile sidebar overlay before navigating away, mirroring the sidebar's own nav links. */
  onNavigate?: () => void;
};

/**
 * Sidebar user badge: displays the current user's avatar and name,
 * navigating directly to /profile when clicked. It is the sidebar's only
 * profile link, so it carries the active state while on /profile.
 */
export function UserMenu({ mobileOpen = false, onNavigate }: UserMenuProps) {
  const { data: currentUser } = useCurrentUser();
  const userName = displayName(currentUser);
  const pathname = usePathname();
  const active = pathname === "/profile" || pathname?.startsWith("/profile/");

  return (
    <Link
      href="/profile"
      onClick={() => onNavigate?.()}
      title={userName}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mx-2 flex h-11 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="bg-gradient-avatar font-bold text-white">
          {userName.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "whitespace-nowrap opacity-0 transition-opacity duration-200 md:group-hover:opacity-100",
          mobileOpen && "max-md:opacity-100"
        )}
      >
        {userName}
      </span>
    </Link>
  );
}

