import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

import type { MonthKey } from "@/features/homepage/month";
import { getSharedWalletTransactions } from "@/features/transactions/transactionsService";
import { WALLETS_QUERY_KEY } from "@/features/wallets/hooks/useWallets";
import {
  acceptInvitation,
  declineInvitation,
  getInvitations,
} from "@/features/wallets/shared/invitationsService";
import {
  getMembers,
  inviteMember,
  leaveWallet,
  removeMember,
  transferOwnership,
} from "@/features/wallets/shared/membersService";

export const MEMBERS_QUERY_KEY = ["wallet-members"] as const;
export const INVITATIONS_QUERY_KEY = ["invitations"] as const;

/** Membership changes ripple into the wallet list (counts, role), Home figures and the transaction lists. */
function invalidateMembershipQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["home-summary"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Members + pending invitations of one shared wallet. Pass `undefined` to skip fetching. */
export function useMembers(walletId: string | undefined) {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: [...MEMBERS_QUERY_KEY, walletId, user?.id],
    queryFn: () => getMembers(walletId as string, user?.id),
    enabled: Boolean(walletId),
  });
}

/** Owner invites by email. The caller shows the failure inline (field errors), so no error toast here. */
export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ walletId, email }: { walletId: string; email: string }) => inviteMember(walletId, email),
    onSuccess: (_member, { email }) => {
      invalidateMembershipQueries(queryClient);
      toast.success(`Invitation sent to ${email}`);
    },
  });
}

/** Removes an accepted member, or cancels a pending invitation when `pending` is set. */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ walletId, userId }: { walletId: string; userId: string; name: string; pending?: boolean }) =>
      removeMember(walletId, userId),
    onSuccess: (_result, { name, pending }) => {
      invalidateMembershipQueries(queryClient);
      toast.success(pending ? `Invitation for ${name} cancelled` : `${name} removed`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't remove this member")),
  });
}

export function useLeaveWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ walletId }: { walletId: string; walletName: string }) => leaveWallet(walletId),
    onSuccess: (_result, { walletName }) => {
      invalidateMembershipQueries(queryClient);
      toast.success(`You left "${walletName}"`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't leave this wallet")),
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ walletId, userId }: { walletId: string; userId: string; name: string }) =>
      transferOwnership(walletId, userId),
    onSuccess: (_result, { name }) => {
      invalidateMembershipQueries(queryClient);
      toast.success(`${name} is now the Owner`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't transfer ownership")),
  });
}

/** Pending invitations for the signed-in user (drives the bell badge and the banner). */
export function useInvitations() {
  return useQuery({
    queryKey: INVITATIONS_QUERY_KEY,
    queryFn: getInvitations,
    // Until the invitations endpoint exists, a failed request just means "no invitations".
    retry: false,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invitationId }: { invitationId: string; walletName: string }) => acceptInvitation(invitationId),
    onSuccess: (_result, { walletName }) => {
      invalidateMembershipQueries(queryClient);
      toast.success(`You joined "${walletName}"`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't accept this invitation")),
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invitationId }: { invitationId: string }) => declineInvitation(invitationId),
    onSuccess: () => {
      invalidateMembershipQueries(queryClient);
      toast.success("Invitation declined");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't decline this invitation")),
  });
}

/**
 * Transactions of one shared wallet for a month (every member's rows).
 * The key starts with `["transactions"]`, so the existing transaction
 * mutations invalidate it too.
 */
export function useSharedWalletTransactions(walletId: string | undefined, month: MonthKey) {
  return useQuery({
    queryKey: ["transactions", "shared", walletId, month],
    queryFn: () => getSharedWalletTransactions(walletId as string, month),
    enabled: Boolean(walletId),
  });
}
