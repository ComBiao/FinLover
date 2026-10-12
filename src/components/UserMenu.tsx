"use client";

import Link from "next/link";
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
 * navigating directly to /profile when clicked.
 */
export function UserMenu({ mobileOpen = false, onNavigate }: UserMenuProps) {
  const { data: currentUser } = useCurrentUser();
  const userName = displayName(currentUser);

  return (
    <Link
      href="/profile"
      onClick={() => onNavigate?.()}
      title={userName}
      className="mx-2 flex h-11 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
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

