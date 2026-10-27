"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { displayName, useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

/**
 * Sidebar user badge: displays the current user's avatar and name
 * as a non-interactive user profile display.
 */
export function UserMenu() {
  const { data: currentUser } = useCurrentUser();
  const userName = displayName(currentUser);

  return (
    <div
      title={userName}
      className="mx-2 flex h-11 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold text-muted-foreground select-none"
    >
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="bg-gradient-avatar font-bold text-white">
          {userName.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 md:group-hover:opacity-100">
        {userName}
      </span>
    </div>
  );
}

