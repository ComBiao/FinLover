"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Mail, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { displayName, useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { ApiClientError, deleteApi } from "@/lib/api/client";

/** Account details plus the delete-account action (no password re-entry — team decision, #88). */
export function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const deleteAccount = useMutation({ mutationFn: () => deleteApi("/api/v1/auth/delete-account") });
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  function leaveAfterAccountGone() {
    queryClient.clear();
    setDeleteOpen(false);
    router.replace("/login");
    router.refresh();
  }

  async function handleConfirmDelete() {
    try {
      await deleteAccount.mutateAsync();
      toast.success("Your account has been deleted");
      leaveAfterAccountGone();
    } catch (error) {
      // 404: the account is already gone and the server cleared the cookie — same end state as success.
      if (error instanceof ApiClientError && error.status === 404) {
        toast.success("Your account has been deleted");
        leaveAfterAccountGone();
      } else if (error instanceof ApiClientError && error.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        leaveAfterAccountGone();
      } else {
        toast.error("Unable to delete your account. Please try again.");
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your account details.</p>

      <Card className="mt-8 gap-6 p-6">
        {isPending ? (
          <div aria-busy="true" aria-label="Loading profile" className="flex flex-col gap-4">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
        ) : isError ? (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load your profile.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <Avatar className="size-16">
              <AvatarFallback className="bg-gradient-avatar text-2xl font-bold text-white">
                {displayName(user).charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <dl className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <User className="size-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Name</dt>
                <dd data-testid="profile-name" className="text-base font-semibold text-foreground">
                  {displayName(user)}
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Email</dt>
                <dd data-testid="profile-email" className="text-sm text-muted-foreground">
                  {user?.email}
                </dd>
              </div>
            </dl>
          </>
        )}
      </Card>

      <Card className="mt-6 gap-3 border-destructive/30 p-6">
        <h2 className="text-base font-semibold text-foreground">Delete account</h2>
        <p className="text-sm text-muted-foreground">
          Permanently deletes your account together with all of your wallets, categories and
          transactions. This cannot be undone.
        </p>
        <div>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="gap-2">
            <Trash2 className="size-4" />
            Delete account
          </Button>
        </div>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              All of your data will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
