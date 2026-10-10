"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClientError, deleteApi, postApi } from "@/lib/api/client";
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
import { displayName, useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

type UserMenuProps = {
  /** Forces the name label visible even without hover — the sidebar's hover-to-expand only applies on desktop, so mobile needs this to show the label when the rail is toggled open. */
  mobileOpen?: boolean;
  /** Closes the mobile sidebar overlay before navigating away, mirroring the sidebar's own nav links. */
  onNavigate?: () => void;
};

/**
 * Sidebar user menu: avatar (+ name once the rail is expanded) trigger a
 * dropdown with Profile, Log out and Delete account. Opens upward since it
 * sits at the bottom of the sidebar. Log out and Delete account both ask for
 * confirmation before redirecting; deleting needs no password re-entry
 * (team decision, #88).
 */
export function UserMenu({ mobileOpen = false, onNavigate }: UserMenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userName = displayName(currentUser);
  const logout = useMutation({ mutationFn: () => postApi('/api/v1/auth/logout') });
  const deleteAccount = useMutation({ mutationFn: () => deleteApi('/api/v1/auth/delete-account') });
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  function handleProfileClick() {
    onNavigate?.();
    router.push("/profile");
  }

  async function handleConfirmLogout() {
    try {
      await logout.mutateAsync();
      queryClient.clear();
      setLogoutDialogOpen(false);
      toast.success('Logged out');
      onNavigate?.();
      router.replace('/login');
      router.refresh();
    } catch { toast.error('Unable to log out. Please try again.'); }
  }

  function leaveAfterAccountGone() {
    queryClient.clear();
    setDeleteDialogOpen(false);
    onNavigate?.();
    router.replace('/login');
    router.refresh();
  }

  async function handleConfirmDelete() {
    try {
      await deleteAccount.mutateAsync();
      toast.success('Your account has been deleted');
      leaveAfterAccountGone();
    } catch (error) {
      // 404: the account is already gone and the server cleared the cookie — same end state as success.
      if (error instanceof ApiClientError && error.status === 404) {
        toast.success('Your account has been deleted');
        leaveAfterAccountGone();
      } else if (error instanceof ApiClientError && error.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        leaveAfterAccountGone();
      } else {
        toast.error('Unable to delete your account. Please try again.');
      }
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="mx-2 flex h-11 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-gradient-avatar font-bold text-white">
              {userName.charAt(0).toUpperCase() || "?"}
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
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            Delete account
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
            <Button type="button" variant="destructive" disabled={logout.isPending} onClick={handleConfirmLogout}>
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        // Don't let a backdrop click / Escape dismiss the dialog while the delete is in flight.
        onOpenChange={(open) => {
          if (!open && deleteAccount.isPending) return;
          setDeleteDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all of your wallets, categories and
              transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteAccount.isPending}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
