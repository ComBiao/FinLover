"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { userName } from "@/lib/mock-data";

type UserMenuProps = {
  /** Forces the name label visible even without hover — the sidebar's hover-to-expand only applies on desktop, so mobile needs this to show the label when the rail is toggled open. */
  mobileOpen?: boolean;
  /** Closes the mobile sidebar overlay before navigating away, mirroring the sidebar's own nav links. */
  onNavigate?: () => void;
};

/**
 * Sidebar user menu: avatar (+ name once the rail is expanded) trigger a
 * dropdown with Profile and Log out. Opens upward since it sits at the
 * bottom of the sidebar. Log out asks for confirmation before redirecting.
 */
export function UserMenu({ mobileOpen = false, onNavigate }: UserMenuProps) {
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);

  function handleProfileClick() {
    onNavigate?.();
    router.push("/profile");
  }

  /**
   * TODO: clear the session/JWT via src/lib/auth.ts and call
   * POST /api/auth/logout — for now this just closes the confirmation
   * dialog, shows a toast, and redirects.
   */
  function handleConfirmLogout() {
    setLogoutDialogOpen(false);
    toast.success("Logged out");
    onNavigate?.();
    router.push("/login");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="mx-2 flex h-11 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-gradient-avatar font-bold text-white">
              {userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap opacity-0 transition-opacity duration-200 md:group-hover:opacity-100",
              mobileOpen && "max-md:opacity-100"
            )}
          >
            {userName}
            <ChevronDown className="size-3.5 shrink-0" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-[170px]">
          <DropdownMenuItem onClick={handleProfileClick}>Profile</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setLogoutDialogOpen(true)}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>Are you sure you want to log out?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmLogout}>
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
