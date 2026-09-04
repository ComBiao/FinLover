"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader() {
  const [toastVisible, setToastVisible] = React.useState(false);

  // TODO: wire to a real logout action — clear the session/JWT via
  // src/lib/auth.ts and POST /api/auth/logout, then redirect to /login.
  function handleLogOut() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2600);
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4 sm:px-8">
      <Logo textClassName="text-base" iconClassName="size-8" />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar>
            <AvatarFallback className="bg-gradient-avatar font-bold text-white">
              A
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-foreground">Alex</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[170px]">
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogOut}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {toastVisible ? (
        <div
          role="status"
          className="fixed bottom-7 right-7 z-50 flex items-center gap-2 rounded-xl bg-foreground px-5 py-3.5 text-sm font-semibold text-background shadow-2xl"
        >
          <Check className="size-4 text-success" />
          Logged out successfully
        </div>
      ) : null}
    </header>
  );
}
